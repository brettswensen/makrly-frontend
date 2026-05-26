export interface Point {
  x: number;
  y: number;
}

export interface Room {
  id: string;
  name: string;
  points: Point[];
  areaSqft: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
}

export interface Door {
  id: string;
  wallId: string;
  position: number;
  width: number;
}

export interface Window {
  id: string;
  wallId: string;
  position: number;
  width: number;
}

export interface FloorPlan {
  id: string;
  name: string;
  rooms: Room[];
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  scale: number;
}
