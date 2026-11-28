/**
 * Renault model photos for the vehicle-selection pages, keyed by `VehicleModel.slug`.
 *
 * Files live in `public/images/vehicles/` (optimized WebP). The frontend prefers these local files over the
 * `imageUrl` stored in the database, because the seeded URLs are hotlinks to Wikimedia filenames that are
 * not guaranteed to exist. Models without an entry render a neutral placeholder until a
 * properly licensed photo is added. Credits: `public/images/CREDITS.md`.
 */
export type VehicleImage = { src: string; width: number; height: number; blur: string };

export const vehicleImages: Record<string, VehicleImage> = {
  'logan': { src: '/images/vehicles/logan.webp', width: 1000, height: 613, blur: 'data:image/webp;base64,UklGRlwAAABXRUJQVlA4IFAAAACwAQCdASoQAAoAA4BaJZwAAj0zWwaAAP7x4JZR1Ty+f4IBB68+wiRzZCsniUYZ8yxS5dT5k0vioDSt7hA0TVuE7QpoNbvceS9ak3tXgeAAAA==' },
  'sandero': { src: '/images/vehicles/sandero.webp', width: 1000, height: 726, blur: 'data:image/webp;base64,UklGRmwAAABXRUJQVlA4IGAAAAAQAgCdASoQAAwAA4BaJZQCdAYsY9aRxoIAAP6pSOGNMdUkDzSFPt4tSbmIFRKt+ftTvmNlrIMTuX20H443DQuJ0KWoqmsiRnzDg6F919HwB9st9F6TZuzftzns3nkBjAA=' },
  'lodgy': { src: '/images/vehicles/lodgy.webp', width: 1000, height: 721, blur: 'data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAgCdASoQAAwAA4BaJYwCdAEfbPpmrQ4AAP6EHwvcaS4JfVLeibWzVSmSzbEVtQZIaPtrtiw0l0spJBnArpuLMX3xpQ4QkQuB41uWgaY6TsmAAAA=' },
  'megane': { src: '/images/vehicles/megane.webp', width: 1000, height: 750, blur: 'data:image/webp;base64,UklGRl4AAABXRUJQVlA4IFIAAAAQAgCdASoQAAwAA4BaJYwCdADRraTkqpnQAOHVGmHssBwXBIoRvWnx9Ncl+7jzNyeVRywHOoQTfoef+/z5zwTjThBM+k2TIll/CO7PpnfgAAAA' },
  'megane-2': { src: '/images/vehicles/megane-2.webp', width: 1000, height: 600, blur: 'data:image/webp;base64,UklGRmwAAABXRUJQVlA4IGAAAAAQAgCdASoQAAoAA4BaJQBOgMX6l4t8KGmAAPa+Q/3QJk1F+gWCwAWlOa2n/YrJFFIorpkZLQO43vgSgCAN2gnD8jWphVd257m5jnGc0zx/ojhwUTXcQBho/DzE5yYgAAA=' },
  'megane-3': { src: '/images/vehicles/megane-3.webp', width: 1000, height: 669, blur: 'data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAgCdASoQAAsAA4BaJaQAAvqpax61L+0AAP7p/aXBdNdzMNRnDciMCAYKWRIFpgm8eglzWae3K/dOLoGV3EULzZ6mxNIXzDezTan8fbs7xhQAAAA=' },
  'megane-4': { src: '/images/vehicles/megane-4.webp', width: 1000, height: 510, blur: 'data:image/webp;base64,UklGRl4AAABXRUJQVlA4IFIAAADwAQCdASoQAAgAA4BaJZQAD4MQBdzrmwAA/k0dVjshiuWg7PTMLjI8y9UfZxL7W3OnmkEutFFrdgenFpAZLXFTYBw8BNHAqdo2pdaQOijFAAAA' },
  'duster': { src: '/images/vehicles/duster.webp', width: 1000, height: 670, blur: 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAADwAQCdASoQAAsAA4BaJYwCdADw2mwIpAAA/pwBG3GZSfnI18uN9rpBt2Nr2WVRecy8aVBmj1qiSjY/AiD6gj+WYuecTY7swwdPlnB5aUELDroIEdHjE/7ZAAA=' },
  'fluence': { src: '/images/vehicles/fluence.webp', width: 1000, height: 671, blur: 'data:image/webp;base64,UklGRmgAAABXRUJQVlA4IFwAAAAwAgCdASoQAAsAA4BaJQBOgMXhyMrdttnqwAD+8SEeo5YF+tONFw3VBSud6YrPE6gCWqcg84Wz4QGIceRVgs8f0f9VBLg0NEdf2T+081nOzEr8g0GUX8IpZ2sAAA==' },
  'captur': { src: '/images/vehicles/captur.webp', width: 1000, height: 666, blur: 'data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAAAQAgCdASoQAAsAA4BaJZgCdADweAC1h3cAAP39M/txBwZMB60xn+QV1ERAeFSiBxQbFpiT1QMM9ze33U5eCV4GjvcETapMnzVMFVFVtPx8k45wEU9gAA==' },
  'kadjar': { src: '/images/vehicles/kadjar.webp', width: 1000, height: 563, blur: 'data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAACwAQCdASoQAAkAA4BaJZQAAgXv0EAAAP5+NSHsHEER6Yg8ePulbMLdo8sXxT5W5QHpUSVPmCejv3CNXzRxpqBqKPUgPAAA' },
  'clio': { src: '/images/vehicles/clio.webp', width: 1000, height: 750, blur: 'data:image/webp;base64,UklGRnIAAABXRUJQVlA4IGYAAABwAgCdASoQAAwAA4BaJaAC7AYsjkyCPn/uzdAAAP7xG4UGlbxx8IbCO3/n5R0xjp4PMyLwObcglRxev092uj/trUdKWAfPAim8CtOGX133Q8zr3CUJaJiCuDB+kvovUwqkVDmswAA=' },
  'scenic': { src: '/images/vehicles/scenic.webp', width: 1000, height: 766, blur: 'data:image/webp;base64,UklGRlwAAABXRUJQVlA4IFAAAADwAQCdASoQAAwAA4BaJZwAAsQFaPa4jgAA+yOyMuKvrzCLOsRN1t+fKm/y3GfaHEYMIXNxJw2oAhYlBreNEj2yXQH/l3Wn4v3K9lON0cAAAA==' },
  'symbol': { src: '/images/vehicles/symbol.webp', width: 1000, height: 636, blur: 'data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAADwAQCdASoQAAoAA4BaJZwAD4hQT/cq4AAA/uTpUsDKmy/k1VYralkIcxuoX52DbVkGv8APzQKjROj1B7WMj02L+beGULc4i1m/5902j3QLBMA4FgAAAA==' },
  'koleos': { src: '/images/vehicles/koleos.webp', width: 1000, height: 581, blur: 'data:image/webp;base64,UklGRlwAAABXRUJQVlA4IFAAAAAQAgCdASoQAAkAA4BaJZQCdAD2MkEd4qmAAP51iKnhwU3WNCfIFxzWX2op77xfSWdMT9wC61Ij9ytKUp4ZNbGOhHQmjFieurFBH7/BiwAAAA==' },
};

export function vehicleImage(slug: string | undefined | null): VehicleImage | undefined {
  return slug ? vehicleImages[slug] : undefined;
}
