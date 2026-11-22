export default function WhyMotors() {
  const points = [
    'خبرة متخصصة في سيارات رينو',
    'توفر قطع غيار مناسبة',
    'صيانة احترافية',
    'حجز مواعيد بسهولة',
    'دعم عملاء موثوق',
  ];
  return (
    <section className="bg-[#0B172B] text-white py-16">
      <div className="container-xl text-center">
        <h2 className="text-3xl font-bold mb-10">لماذا MOTORS 7؟</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {points.map((p) => (
            <div key={p} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-brand-orange text-2xl mb-2">✓</div>
              <div className="text-sm">{p}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
