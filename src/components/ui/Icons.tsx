import type { ComponentType } from 'react';
import type { IconProps as PhosphorProps } from '@phosphor-icons/react/dist/lib/types';
// One file per icon, from the server-safe build: works in server and client
// components alike, and only the icons named here end up in the bundle.
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { ArrowDown } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import { BaseballCap } from '@phosphor-icons/react/dist/ssr/BaseballCap';
import { CaretDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretLeft } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { Copy } from '@phosphor-icons/react/dist/ssr/Copy';
import { DeviceMobile } from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import { Envelope } from '@phosphor-icons/react/dist/ssr/Envelope';
import { Handbag } from '@phosphor-icons/react/dist/ssr/Handbag';
import { Heart } from '@phosphor-icons/react/dist/ssr/Heart';
import { InstagramLogo } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { List } from '@phosphor-icons/react/dist/ssr/List';
import { LockSimple } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPin } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Minus } from '@phosphor-icons/react/dist/ssr/Minus';
import { Moon } from '@phosphor-icons/react/dist/ssr/Moon';
import { Palette } from '@phosphor-icons/react/dist/ssr/Palette';
import { Phone } from '@phosphor-icons/react/dist/ssr/Phone';
import { Plus } from '@phosphor-icons/react/dist/ssr/Plus';
import { Ruler } from '@phosphor-icons/react/dist/ssr/Ruler';
import { ShareNetwork } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { SlidersHorizontal } from '@phosphor-icons/react/dist/ssr/SlidersHorizontal';
import { Sparkle } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Star } from '@phosphor-icons/react/dist/ssr/Star';
import { Sun } from '@phosphor-icons/react/dist/ssr/Sun';
import { Tag } from '@phosphor-icons/react/dist/ssr/Tag';
import { TiktokLogo } from '@phosphor-icons/react/dist/ssr/TiktokLogo';
import { Trash } from '@phosphor-icons/react/dist/ssr/Trash';
import { Truck } from '@phosphor-icons/react/dist/ssr/Truck';
import { TShirt } from '@phosphor-icons/react/dist/ssr/TShirt';
import { User } from '@phosphor-icons/react/dist/ssr/User';
import { WhatsappLogo } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';
import { X } from '@phosphor-icons/react/dist/ssr/X';

/**
 * The site's icon set: Phosphor, behind the names the app already uses.
 * `width`/`height` still work (they set the size), decorative by default,
 * and `weight` switches style — e.g. `weight="fill"` for a saved heart.
 */
export type IconProps = Omit<PhosphorProps, 'size'> & { size?: number | string };

function phosphor(Glyph: ComponentType<PhosphorProps>, name: string, defaults: Partial<PhosphorProps> = {}) {
  function Icon({ width, height, size, ...props }: IconProps) {
    return <Glyph aria-hidden="true" focusable="false" size={size ?? width ?? height ?? 20} weight="regular" {...defaults} {...props} />;
  }
  Icon.displayName = name;
  return Icon;
}

// ── Names used across the app ──────────────────────────────
export const SearchIcon = phosphor(MagnifyingGlass, 'SearchIcon');
export const BagIcon = phosphor(Handbag, 'BagIcon');
export const HeartIcon = phosphor(Heart, 'HeartIcon');
export const UserIcon = phosphor(User, 'UserIcon');
export const MenuIcon = phosphor(List, 'MenuIcon');
export const XIcon = phosphor(X, 'XIcon');
export const TrashIcon = phosphor(Trash, 'TrashIcon');
export const PlusIcon = phosphor(Plus, 'PlusIcon', { weight: 'bold' });
export const MinusIcon = phosphor(Minus, 'MinusIcon', { weight: 'bold' });
export const ArrowRightIcon = phosphor(ArrowRight, 'ArrowRightIcon', { weight: 'bold' });
export const TruckIcon = phosphor(Truck, 'TruckIcon');
export const ReturnIcon = phosphor(ArrowCounterClockwise, 'ReturnIcon');
export const LockIcon = phosphor(LockSimple, 'LockIcon');
export const StarIcon = phosphor(Star, 'StarIcon', { weight: 'fill' });
export const SlidersIcon = phosphor(SlidersHorizontal, 'SlidersIcon');
export const RulerIcon = phosphor(Ruler, 'RulerIcon');
export const ShareIcon = phosphor(ShareNetwork, 'ShareIcon');
export const MailIcon = phosphor(Envelope, 'MailIcon');
export const MapPinIcon = phosphor(MapPin, 'MapPinIcon');
export const PhoneIcon = phosphor(Phone, 'PhoneIcon');
export const SunIcon = phosphor(Sun, 'SunIcon');
export const MoonIcon = phosphor(Moon, 'MoonIcon');
export const CheckIcon = phosphor(Check, 'CheckIcon', { weight: 'bold' });
export const ChevronLeftIcon = phosphor(CaretLeft, 'ChevronLeftIcon', { weight: 'bold' });
export const ChevronRightIcon = phosphor(CaretRight, 'ChevronRightIcon', { weight: 'bold' });
export const ChevronDownIcon = phosphor(CaretDown, 'ChevronDownIcon', { weight: 'bold' });
export const CopyIcon = phosphor(Copy, 'CopyIcon');
export const ShieldIcon = phosphor(ShieldCheck, 'ShieldIcon');

// ── Storefront ─────────────────────────────────────────────
export const ArrowDownIcon = phosphor(ArrowDown, 'ArrowDownIcon', { weight: 'bold' });
export const ArrowUpRightIcon = phosphor(ArrowUpRight, 'ArrowUpRightIcon', { weight: 'bold' });
export const TShirtIcon = phosphor(TShirt, 'TShirtIcon');
export const CapIcon = phosphor(BaseballCap, 'CapIcon');
export const PaletteIcon = phosphor(Palette, 'PaletteIcon');
export const MobilePayIcon = phosphor(DeviceMobile, 'MobilePayIcon');
export const TagIcon = phosphor(Tag, 'TagIcon');
export const SparkleIcon = phosphor(Sparkle, 'SparkleIcon');
export const WhatsappIcon = phosphor(WhatsappLogo, 'WhatsappIcon', { weight: 'fill' });
export const TiktokIcon = phosphor(TiktokLogo, 'TiktokIcon', { weight: 'fill' });
export const InstagramIcon = phosphor(InstagramLogo, 'InstagramIcon');
