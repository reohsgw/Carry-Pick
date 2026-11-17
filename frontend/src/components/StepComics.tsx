import step1 from '../assets/step-1.jpg';
import step2 from '../assets/step-2.jpg';
import step3 from '../assets/step-3.jpg';

function comic(src: string) {
  return function StepComic() {
    return <img src={src} alt="" aria-hidden="true" className="step-comic" loading="lazy" decoding="async" />;
  };
}

export const PostWish = comic(step1);
export const MatchTraveler = comic(step2);
export const ReceiveSafely = comic(step3);

export const STEP_COMICS = [PostWish, MatchTraveler, ReceiveSafely];
