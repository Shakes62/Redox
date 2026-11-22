import Image from 'next/image';
import { WhatsappIcon } from '@/components/ui/Icons';
import { whatsappLink } from '@/lib/product-display';
import styles from './Home.module.css';

export interface PrintShot {
  image: string;
}

/** Custom printing in one card: three shirts with a mock print, and one button. */
export function PrintBand({ shots }: { shots: PrintShot[] }) {
  return (
    <section aria-labelledby="print-title" className={styles.section}>
      <div className={styles.printCard}>
        <div>
          <h2 className={styles.printTitle} id="print-title">
            Got a design?
            <br />
            We print it.
          </h2>
          <p className={styles.printText}>Logos, teams, events, brands. Send it on WhatsApp.</p>
          <a
            className={styles.whatsapp}
            href={whatsappLink('Hi REDOXDESIGNX, I want to print my design. Here are the details:')}
            rel="noopener noreferrer"
            target="_blank"
          >
            <WhatsappIcon size={22} />
            Chat on WhatsApp
          </a>
        </div>

        {shots.length === 3 ? (
          <div aria-hidden="true" className={styles.printArt}>
            {shots.map((shot) => (
              <span className={styles.printShirt} key={shot.image}>
                <Image alt="" fill sizes="(min-width: 900px) 240px, 40vw" src={shot.image} />
                <span className={styles.printMark}>
                  Your
                  <br />
                  logo
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
