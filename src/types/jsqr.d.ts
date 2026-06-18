declare module "jsqr" {
  interface Point {
    x: number;
    y: number;
  }
  interface QRCode {
    data: string;
    location: {
      topLeft: Point;
      topRight: Point;
      bottomLeft: Point;
      bottomRight: Point;
      topLeftFinder: Point;
      topRightFinder: Point;
      bottomLeftFinder: Point;
    };
    chunks: { type: number; text: string }[];
    version: number;
  }
  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): QRCode | null;
  export = jsQR;
}
