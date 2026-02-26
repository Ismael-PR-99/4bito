export interface RetroProduct {
  id: string;
  name: string;
  country: string;
  year: number;
  decade: '70s' | '80s' | '90s' | '00s';
  category: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  unitsSold: number;
  sizes: string[];
}
