export interface Category {
  id: string;
  name: string;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ItemVariant {
  id: string;
  name: string;
  priceModifier: number;
  isAvailable: boolean;
}

export interface ItemAddon {
  id: string;
  name: string;
  extraPrice: number;
  isAvailable: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  prepTimeMinutes: number;
  variants: ItemVariant[];
  addons: ItemAddon[];
}
