'use client';

import WebRecorder from './WebRecorder';

interface WebRecorderWrapperProps {
  challengeId: string;
  challengeTitle: string;
  timeLimit: number;
}

export default function WebRecorderWrapper({
  challengeId,
  challengeTitle,
  timeLimit
}: WebRecorderWrapperProps) {
  return (
    <WebRecorder
      challengeId={challengeId}
      challengeTitle={challengeTitle}
      timeLimit={timeLimit}
      onSubmissionComplete={(success) => {
        if (success) {
          console.log('Submission complete!');
        }
      }}
    />
  );
}
