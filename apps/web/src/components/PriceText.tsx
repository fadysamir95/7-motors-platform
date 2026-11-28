/** Digits use Exo 2 Black Italic (brand numerals); the Arabic currency label keeps the body font. */
export default function PriceText({ value }: { value: string }) {
  return (
    <>
      {value.split(/(d[d,]*)/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-price text-[1.1em]">{part}</span>
        ) : (
          <span key={i} className="font-extrabold">{part}</span>
        ),
      )}
    </>
  );
}
