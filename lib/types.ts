/**
 * The shape the WEBSITE uses. Proteus's raw field names are translated
 * into this in ONE place — `mapProduct()` in lib/proteus.ts.
 */

/** One terpene reading from lab data, e.g. { name: "Linalool", percent: 0.56 } */
export type Terpene = {
  name: string;
  percent: number;
};

/**
 * Lab / cannabinoid data. Comes from the `categoryListProducts` endpoint,
 * which only covers ~70% of the catalog — every field here is optional and
 * the UI must hide the section rather than invent a value.
 */
export type LabData = {
  thc?: number;
  thca?: number;
  thcv?: number;
  cbd?: number;
  cbda?: number;
  cbg?: number;
  cbn?: number;
  cbc?: number;
  /** total terpene percentage */
  terpsTotal?: number;
  /** top terpenes, de-duplicated, highest first */
  topTerps?: Terpene[];
};

export type Product = {
  id: string;
  /** needed later for creating pickup orders via addInvoice */
  sku?: string;
  name: string;
  brand?: string;
  /** our slug: flower | pre-rolls | vapes | edibles | concentrate | topicals | … */
  category: string;
  /** what Proteus actually called it, e.g. "AIO", "3.5g Flower" — the sub-category */
  proteusCategory?: string;
  /** the cultivar, e.g. "Sour Spritzer" */
  strain?: string;
  /** Sativa | Indica | Hybrid — from Proteus's `dominance` field */
  dominance?: string;
  /** marketing copy from Proteus, HTML stripped to plain paragraphs */
  description?: string;
  price?: number;
  salePrice?: number;
  /** e.g. "each" */
  unit?: string;
  imageUrl?: string;
  inStock: boolean;
  /** what we show and gate on — prefers `inventory_sellable` when Proteus has it */
  stockCount?: number;
  /**
   * Raw `num_in_stock` from the register, kept for debugging. Can disagree with
   * `stockCount`: a product may be physically on hand but not sellable.
   */
  onHandCount?: number;
  /** present only when the product was matched in categoryListProducts */
  lab?: LabData;
};

export type MenuResult = {
  products: Product[];
  /** true when the data came from Proteus, false when it's the sample set */
  live: boolean;
  error?: string;
  fetchedAt?: number;
};
