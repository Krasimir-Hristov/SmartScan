import React from 'react';
import { Circle, Line, Polygon, Rect, Svg } from '@react-pdf/renderer';
import type { PlaqueCountryCode } from '../../lib/plaqueConfig';
import { FLAG_ASPECT_RATIO } from '../../lib/plaquePdfStyles';

const VIEW_BOX = '0 0 60 45';
const FLAG_WIDTH = 60;
const FLAG_HEIGHT = 45;

export interface PlaquePdfFlagProps {
  countryCode: PlaqueCountryCode;
  width: number;
}

const horizontalTricolor = (
  top: string,
  middle: string,
  bottom: string,
): React.ReactElement[] => [
  <Rect key='top' x={0} y={0} width={FLAG_WIDTH} height={15} fill={top} />,
  <Rect
    key='middle'
    x={0}
    y={15}
    width={FLAG_WIDTH}
    height={15}
    fill={middle}
  />,
  <Rect
    key='bottom'
    x={0}
    y={30}
    width={FLAG_WIDTH}
    height={15}
    fill={bottom}
  />,
];

const verticalTricolor = (
  left: string,
  middle: string,
  right: string,
): React.ReactElement[] => [
  <Rect key='left' x={0} y={0} width={20} height={FLAG_HEIGHT} fill={left} />,
  <Rect
    key='middle'
    x={20}
    y={0}
    width={20}
    height={FLAG_HEIGHT}
    fill={middle}
  />,
  <Rect
    key='right'
    x={40}
    y={0}
    width={20}
    height={FLAG_HEIGHT}
    fill={right}
  />,
];

const unionJack = (): React.ReactElement[] => [
  <Rect key='field' x={0} y={0} width={60} height={45} fill='#012169' />,
  <Line
    key='st-andrew-a'
    x1={0}
    y1={0}
    x2={60}
    y2={45}
    stroke='#FFFFFF'
    strokeWidth={9}
  />,
  <Line
    key='st-andrew-b'
    x1={60}
    y1={0}
    x2={0}
    y2={45}
    stroke='#FFFFFF'
    strokeWidth={9}
  />,
  <Line
    key='st-patrick-a'
    x1={0}
    y1={0}
    x2={60}
    y2={45}
    stroke='#C8102E'
    strokeWidth={4.5}
  />,
  <Line
    key='st-patrick-b'
    x1={60}
    y1={0}
    x2={0}
    y2={45}
    stroke='#C8102E'
    strokeWidth={4.5}
  />,
  <Rect key='cross-white-v' x={25.5} y={0} width={9} height={45} fill='#FFFFFF' />,
  <Rect key='cross-white-h' x={0} y={18} width={60} height={9} fill='#FFFFFF' />,
  <Rect key='cross-red-v' x={27} y={0} width={6} height={45} fill='#C8102E' />,
  <Rect key='cross-red-h' x={0} y={19.5} width={60} height={6} fill='#C8102E' />,
];

const greekStripes = (): React.ReactElement[] => {
  const stripes: React.ReactElement[] = [];
  for (let index = 0; index < 9; index += 1) {
    stripes.push(
      <Rect
        key={`stripe-${index}`}
        x={0}
        y={index * 5}
        width={60}
        height={5}
        fill={index % 2 === 0 ? '#0D5EAF' : '#FFFFFF'}
      />,
    );
  }
  stripes.push(
    <Rect key='canton' x={0} y={0} width={25} height={25} fill='#0D5EAF' />,
    <Rect key='cross-v' x={10} y={0} width={5} height={25} fill='#FFFFFF' />,
    <Rect key='cross-h' x={0} y={10} width={25} height={5} fill='#FFFFFF' />,
  );
  return stripes;
};

const turkishFlag = (): React.ReactElement[] => [
  <Rect key='field' x={0} y={0} width={60} height={45} fill='#E30A17' />,
  <Circle key='crescent-outer' cx={22} cy={22.5} r={10} fill='#FFFFFF' />,
  <Circle key='crescent-inner' cx={25} cy={22.5} r={8} fill='#E30A17' />,
  <Polygon
    key='star'
    fill='#FFFFFF'
    points='37.00,17.90 38.12,20.96 41.37,21.08 38.81,23.09 39.70,26.22 37.00,24.40 34.30,26.22 35.19,23.09 32.63,21.08 35.88,20.96'
  />,
];

/** Visible neutral stand-in: an unmapped code must never render an empty SVG. */
const unmappedFlag = (): React.ReactElement[] => [
  <Rect
    key='unmapped-field'
    x={0}
    y={0}
    width={FLAG_WIDTH}
    height={FLAG_HEIGHT}
    fill='#E4E4E7'
  />,
  <Rect
    key='unmapped-mark'
    x={0}
    y={FLAG_HEIGHT / 2 - 2.5}
    width={FLAG_WIDTH}
    height={5}
    fill='#A1A1AA'
  />,
];

/**
 * One renderer per supported country code. The map is a total `Record`, so a new
 * plaque language without its vector flag fails at compile time instead of
 * silently printing an empty flag.
 */
const FLAG_RENDERERS: Record<PlaqueCountryCode, () => React.ReactElement[]> = {
  gb: unionJack,
  bg: () => horizontalTricolor('#FFFFFF', '#00966E', '#D62612'),
  de: () => horizontalTricolor('#000000', '#DD0000', '#FFCE00'),
  ro: () => verticalTricolor('#002B7F', '#FCD116', '#CE1126'),
  gr: greekStripes,
  ru: () => horizontalTricolor('#FFFFFF', '#0039A6', '#D52B1E'),
  tr: turkishFlag,
  es: () => [
    <Rect key='top' x={0} y={0} width={60} height={11.25} fill='#AA151B' />,
    <Rect
      key='middle'
      x={0}
      y={11.25}
      width={60}
      height={22.5}
      fill='#F1BF00'
    />,
    <Rect
      key='bottom'
      x={0}
      y={33.75}
      width={60}
      height={11.25}
      fill='#AA151B'
    />,
  ],
  it: () => verticalTricolor('#008C45', '#F4F5F0', '#CD212A'),
  fr: () => verticalTricolor('#0055A4', '#FFFFFF', '#EF4135'),
};

const getFlagShapes = (countryCode: PlaqueCountryCode): React.ReactElement[] =>
  FLAG_RENDERERS[countryCode]?.() ?? unmappedFlag();

/** Pure vector flags (no emoji, no external assets) for the printed PDF. */
export const PlaquePdfFlag: React.FC<PlaquePdfFlagProps> = ({
  countryCode,
  width,
}) => (
  <Svg
    viewBox={VIEW_BOX}
    style={{ width, height: width * FLAG_ASPECT_RATIO }}
  >
    {getFlagShapes(countryCode)}
  </Svg>
);
