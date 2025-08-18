import {Transform, TransformFnParams} from "@nestjs/class-transformer"
import { sanitizeContent } from '../utils/sanitize.utils';

export function Sanitize() {
    return Transform(({ value }: TransformFnParams) => {
      if (typeof value === 'string') {
        return sanitizeContent(value);
      }
      
      if (typeof value === 'object' && value !== null) {
        // Handle Record<string, string>
        if (!Array.isArray(value)) {
          return Object.fromEntries(
            Object.entries(value).map(([key, val]) => 
              [key, typeof val === 'string' ? sanitizeContent(val) : val]
          ));
        }
      }
      
      return value;
    });
  }