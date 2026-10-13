import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IPageDocument extends Document {
  tenantId: Types.ObjectId;
  title: string;
  slug: string;
  isPublished: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
  };
  blocks: Array<{
    id: string;
    type: 'HERO' | 'COURSE_GRID' | 'INSTRUCTORS' | 'PRICING' | 'TESTIMONIALS' | 'FAQ' | 'CTA' | 'RICH_TEXT';
    data: any;
    styles?: any;
    order: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPageDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    isPublished: { type: Boolean, default: false },
    seo: {
      metaTitle: String,
      metaDescription: String,
      ogImageUrl: String
    },
    blocks: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        data: { type: Schema.Types.Mixed, required: true },
        styles: { type: Schema.Types.Mixed },
        order: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
);

PageSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
PageSchema.plugin(tenantIsolationPlugin);

export const PageModel = model<IPageDocument>('Page', PageSchema);
