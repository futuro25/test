import {cva} from 'class-variance-authority';
import * as React from 'react';

import {cn, tw} from '../../utils/utils';

const buttonVariants = cva(
  tw`inline-flex truncate items-center whitespace-nowrap justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none`,
  {
    variants: {
      variant: {
        default: tw`bg-emerald-500 text-white hover:bg-emerald-500/90 focus-visible:ring-emerald-500`,
        secondary: tw`border border-emerald-500 text-emerald-500 hover:bg-emerald-100 focus-visible:ring-emerald-500`,
        alternative: tw`bg-blue-500 text-white hover:bg-blue-500/90 focus-visible:ring-blue-500`,
        alternativeSecondary: tw`bg-orange-500 text-white hover:bg-orange-500/90 focus-visible:ring-orange-500`,
        destructive: tw`bg-red-500 text-white hover:bg-red-500/90 focus-visible:ring-red`,
        outlined: tw`border bg-white border-gray-100 hover:bg-gray-50 text-gray-900 focus-visible:ring-gray-100`,
      },
      size: {
        sm: tw`px-2 h-8 rounded text-sm`,
        default: tw`px-3 h-10 rounded text-sm`,
        lg: tw`px-8 h-12 rounded text-sm`,
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);


export default function Button({className, variant, size, ...props}) {
  return <button className={cn(buttonVariants({variant, size, className}))} {...props} />;
};