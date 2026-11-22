import { MobilePayIcon, PaletteIcon, TShirtIcon } from '@/components/ui/Icons';
import styles from './Home.module.css';

/** Buying, explained in three steps — the same three the product page walks through. */
export function Steps({ bulkMin }: { bulkMin: number | null }) {
  const steps = [
    { Icon: PaletteIcon, title: 'Pick a colour', text: 'Tap a dot to see it on the shirt' },
    { Icon: TShirtIcon, title: 'Tap your sizes', text: bulkMin ? `${bulkMin}+ pieces get the wholesale price` : 'Mix any sizes you like' },
    { Icon: MobilePayIcon, title: 'Pay with MoMo', text: 'Card or bank too. We deliver to your town' }
  ];

  return (
    <section aria-labelledby="steps-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle} id="steps-title">How it works</h2>
      </div>
      <ol className={styles.steps}>
        {steps.map(({ Icon, title, text }, index) => (
          <li className={styles.stepItem} key={title}>
            <span className={styles.stepIcon}>
              <Icon size={26} weight="duotone" />
              <span className={styles.stepNum}>{index + 1}</span>
            </span>
            <span className={styles.stepText}>
              <strong>{title}</strong>
              <span>{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
