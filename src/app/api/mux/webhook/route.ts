import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verify Mux webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return true; // Skip verification if no secret configured

  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.split('=')[1];
  const expectedSignature = signaturePart.split('=')[1];

  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return computedSignature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('mux-signature') || '';
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET || '';

    // Verify signature (optional but recommended)
    if (webhookSecret && !verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid Mux webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(payload);
    console.log('Mux webhook received:', event.type, JSON.stringify(event.data, null, 2));

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Handle different event types
    switch (event.type) {
      case 'video.asset.ready': {
        // Video is ready for playback
        const asset = event.data;
        const passthrough = asset.passthrough ? JSON.parse(asset.passthrough) : null;

        if (!passthrough) {
          console.log('No passthrough data, skipping');
          break;
        }

        const { user_id, challenge_id, upload_type } = passthrough;
        const playbackId = asset.playback_ids?.[0]?.id;
        const assetId = asset.id;
        const duration = asset.duration; // in seconds

        // Get the upload ID from the asset's source (the upload that created this asset)
        const sourceUploadId = asset.upload_id;

        console.log('Video ready:', {
          assetId,
          playbackId,
          duration,
          uploadType: upload_type,
          challengeId: challenge_id,
          userId: user_id,
          sourceUploadId,
        });

        if (upload_type === 'reference') {
          // Update challenge with reference video
          const { error } = await supabase
            .from('challenges')
            .update({
              reference_video_asset_id: assetId,
              reference_video_playback_id: playbackId,
              reference_video_duration: Math.round(duration * 1000), // Convert to ms
            })
            .eq('id', challenge_id);

          if (error) {
            console.error('Error updating challenge with reference video:', error);
          } else {
            console.log('Reference video saved for challenge:', challenge_id);
          }
        } else {
          // Create or update submission with video
          console.log('Looking for existing submission:', { user_id, challenge_id, sourceUploadId });

          // First try to find by mux_upload_id if available
          let existingSubmission = null;
          let searchError = null;

          if (sourceUploadId) {
            const result = await supabase
              .from('submissions')
              .select('id, mux_asset_id')
              .eq('mux_upload_id', sourceUploadId)
              .eq('status', 'pending')
              .single();
            existingSubmission = result.data;
            searchError = result.error;
            console.log('Search by mux_upload_id result:', { existingSubmission, searchError });
          }

          // Fallback: search by user_id + challenge_id
          if (!existingSubmission) {
            const result = await supabase
              .from('submissions')
              .select('id, mux_asset_id')
              .eq('user_id', user_id)
              .eq('challenge_id', challenge_id)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            existingSubmission = result.data;
            searchError = result.error;
            console.log('Search by user_id+challenge_id result:', { existingSubmission, searchError });
          }

          if (existingSubmission) {
            // Update existing submission with video data
            console.log('Updating existing submission:', existingSubmission.id);
            const { error } = await supabase
              .from('submissions')
              .update({
                mux_asset_id: assetId,
                mux_playback_id: playbackId,
                video_url: `https://stream.mux.com/${playbackId}.m3u8`,
                duration: Math.round(duration * 1000),
              })
              .eq('id', existingSubmission.id);

            if (error) {
              console.error('Error updating submission with video:', error);
            } else {
              console.log('Submission video updated:', existingSubmission.id);
            }
          } else {
            // Create new submission with video (actions will be added by /api/upload later)
            const { data: newSubmission, error } = await supabase
              .from('submissions')
              .insert({
                user_id,
                challenge_id,
                mux_asset_id: assetId,
                mux_playback_id: playbackId,
                video_url: `https://stream.mux.com/${playbackId}.m3u8`,
                duration: Math.round(duration * 1000),
                status: 'pending',
              })
              .select()
              .single();

            if (error) {
              console.error('Error creating submission:', error);
            } else {
              console.log('New submission created with video:', newSubmission.id);
            }
          }
        }
        break;
      }

      case 'video.asset.errored': {
        // Video processing failed
        const asset = event.data;
        console.error('Video processing failed:', asset.id, asset.errors);
        break;
      }

      case 'video.upload.asset_created': {
        // Upload completed, asset is being processed
        console.log('Upload completed, asset created:', event.data.asset_id);
        break;
      }

      default:
        console.log('Unhandled Mux event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Mux webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
