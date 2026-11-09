import ScreenShell from '../components/ScreenShell';

// Opened from the video icon beside Home's search bar. Intentionally empty
// for now, same as the web VideoPage — content gets defined step by step.
export default function VideoScreen({ onBack }) {
  return <ScreenShell title="Videos" onBack={onBack} />;
}
