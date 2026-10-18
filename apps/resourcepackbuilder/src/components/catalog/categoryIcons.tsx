/** The icons of catalog categories: a card without an icon of its own shows its category's. */
import type { ReactNode } from 'react';
import {
  Archive,
  ArrowDownToLine,
  Box,
  Brush,
  Cpu,
  Footprints,
  Lightbulb,
  MessageSquareText,
  MousePointerClick,
  Puzzle,
  Shield,
  Shirt,
  Sprout,
  Star,
  Sword,
  UtensilsCrossed,
} from 'lucide-react';

const ICONS: Record<string, ReactNode> = {
  common: <Star />,
  shapes: <Box />,
  redstone: <Lightbulb />,
  blockEntities: <Archive />,
  physics: <ArrowDownToLine />,
  placement: <Footprints />,
  plants: <Sprout />,
  food: <UtensilsCrossed />,
  combat: <Sword />,
  tooltip: <MessageSquareText />,
  equipment: <Shirt />,
  armor: <Shield />,
  appearance: <Brush />,
  behavior: <Cpu />,
  interaction: <MousePointerClick />,
};

/** The icon of a category id, a puzzle piece for unknown ones. */
export function categoryIcon(category: string | undefined): ReactNode {
  return (category && ICONS[category]) ?? <Puzzle />;
}
