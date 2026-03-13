import { getLocalCubs } from '@/lib/cubs';
import { PRODUCTS } from '@/lib/products';
import Link from 'next/link';
import Image from 'next/image';

const PRODUCT_ICONS: Record<string, string> = {
  hoodie:  '🧥',
  joggers: '👖',
  cap:     '🧢',
};

export default function HomePage() {
  const cubs = getLocalCubs();

  return (
    <main>
      {/* PRODUCT TYPES */}
      <section>
        <div className="font-cinzel text-[11px] tracking-[5px] text-gold opacity-55 uppercase text-center mb-5">
          ✦ Choose Your Item ✦
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {Object.values(PRODUCTS).map(p => (
            <Link
              key={p.type}
              href={`/products/${p.type}`}
              className="card-border p-6 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="text-4xl mb-3">{PRODUCT_ICONS[p.type]}</div>
              <div className="font-cinzel text-[13px] font-semibold text-quartz mb-1 group-hover:text-gold transition-colors">
                {p.name.replace('OkayCubs ', '')}
              </div>
              <div className="font-crimson text-[12px] text-silver opacity-50 mb-3 leading-snug">
                {p.description}
              </div>
              <div className="font-cinzel text-[11px] tracking-[2px] text-gold opacity-80">
                from ${(p.basePrice / 100).toFixed(2)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CUBS GALLERY */}
      <section>
        <div className="font-cinzel text-[11px] tracking-[5px] text-gold opacity-55 uppercase text-center mb-5">
          ✦ Your Cubs ✦
        </div>

        {cubs.some(c => c.image) ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {cubs.map(cub => (
              <Link
                key={cub.id}
                href={`/products/hoodie?cub=${cub.id}`}
                className="card-border p-4 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold/25 mx-auto mb-3 relative">
                  {cub.image ? (
                    <Image src={cub.image} alt={cub.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-black/40">🐻</div>
                  )}
                </div>
                <div className="font-cinzel text-[12px] text-quartz group-hover:text-gold transition-colors">
                  {cub.name}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 card-border">
            <div className="text-4xl mb-4">🐻</div>
            <div className="font-cinzel text-[11px] tracking-[3px] text-gold opacity-60 uppercase mb-2">
              Cubs Loading Soon
            </div>
            <div className="font-crimson text-[14px] text-silver opacity-40 italic">
              Add your Cub images to <code className="not-italic opacity-70">public/cubs/</code> to see them here
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
