export interface NavItem {
  label: string;
  href: string;
}

export interface MetricItem {
  value: string;
  label: string;
  sublabel: string;
}

export interface WorkflowStep {
  number: string;
  tag: string;
  title: string;
  description: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  tag?: string;
  isWide?: boolean;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  property: string;
  location: string;
  rating: number;
}

export interface PricingPlan {
  name: string;
  tag: string;
  priceMonthly: string;
  priceAnnual: string;
  period: string;
  features: string[];
}
