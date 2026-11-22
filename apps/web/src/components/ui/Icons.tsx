import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Points toward the end of the line; mirrors automatically in RTL. */
export const ArrowIcon = (p: IconProps) => (
  <Svg {...p} className={`rtl:-scale-x-100 ${p.className ?? ''}`}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const MenuIcon = (p: IconProps) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const CartIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></Svg>
);
export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></Svg>
);
export const WrenchIcon = (p: IconProps) => (
  <Svg {...p}><path d="M14.7 6.3a4 4 0 0 0 4.9 4.9l-9.4 9.4a2.1 2.1 0 0 1-3-3l9.4-9.4a4 4 0 0 0-1.9-1.9z" transform="translate(0 -1)" /></Svg>
);
export const PartsIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" /></Svg>
);
export const CarIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 16v-3.5l1.8-4.2A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.3l1.8 4.2V16" /><path d="M3 16h18v2.5a.5.5 0 0 1-.5.5H18a.5.5 0 0 1-.5-.5V17h-11v1.5a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5z" /><circle cx="7.5" cy="13" r=".9" /><circle cx="16.5" cy="13" r=".9" /></Svg>
);
export const BoxIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" /></Svg>
);
export const ListIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></Svg>
);
export const ClipboardIcon = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="4.5" width="14" height="16.5" rx="2.5" /><path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5M8.5 11h7M8.5 15h5" /></Svg>
);
export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></Svg>
);
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const GaugeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 17a8.5 8.5 0 1 1 15 0" /><path d="M12 13l3.5-4" /></Svg>
);
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 4h3.5l1.6 4-2 1.3a11 11 0 0 0 5.6 5.6l1.3-2 4 1.6V18a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2z" /></Svg>
);
export const MailIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></Svg>
);
export const PinIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s7-6 7-11.5A7 7 0 0 0 5 9.5C5 15 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>
);
export const FuelIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20M4 20h11" /><path d="M7 8h5M14 9h2.2a1.8 1.8 0 0 1 1.8 1.8V16a1.5 1.5 0 0 0 3 0V9l-2.5-2.5" /></Svg>
);
export const TransmissionIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="6" cy="5.5" r="1.8" /><circle cx="12" cy="5.5" r="1.8" /><circle cx="18" cy="5.5" r="1.8" /><circle cx="6" cy="18.5" r="1.8" /><circle cx="12" cy="18.5" r="1.8" /><path d="M6 7.3v9.4M12 7.3v9.4M18 7.3V12H6" /></Svg>
);
