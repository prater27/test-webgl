import { PerspectiveCamera, Raycaster, Scene, Vector2 } from "three";
import Tile from "./Tile";


export function getTileFromRaycast(event: MouseEvent, canvas: HTMLCanvasElement, camera: PerspectiveCamera, scene: Scene) {
  const raycaster = new Raycaster();
  const pointer = new Vector2(0, 0);
  pointer.x = ( (event.clientX + canvas.offsetLeft) / canvas.width ) * 2 - 1;
  pointer.y = - ( (event.clientY - canvas.offsetTop) / canvas.height ) * 2 + 1;

  raycaster.setFromCamera( pointer, camera );
  const intersects = raycaster.intersectObjects( scene.children );
  if (intersects.length > 0 && intersects[0].object && intersects[0].object.name == "Tile") {
    let mesh = intersects[0].object.userData;
    if (mesh instanceof Tile) {
      return mesh;
    }
  }
}

export function isNeighborForEvenTile(tile: Tile, target: Tile): boolean {
  return tile.index.x == target.index.x - 1 && tile.index.y == target.index.y - 1 ||
  tile.index.x == target.index.x - 1 && tile.index.y == target.index.y ||
  tile.index.x == target.index.x - 1 && tile.index.y == target.index.y  + 1 ||
  tile.index.x == target.index.x && tile.index.y == target.index.y + 1 ||
  tile.index.x == target.index.x + 1 && tile.index.y == target.index.y ||
  tile.index.x == target.index.x && tile.index.y == target.index.y - 1
}


export function isNeighborForOddTile(tile: Tile, target: Tile): boolean {
  return tile.index.x == target.index.x && tile.index.y == target.index.y - 1 ||
  tile.index.x == target.index.x - 1 && tile.index.y == target.index.y ||
  tile.index.x == target.index.x && tile.index.y == target.index.y  + 1 ||
  tile.index.x == target.index.x + 1 && tile.index.y == target.index.y + 1 ||
  tile.index.x == target.index.x + 1 && tile.index.y == target.index.y ||
  tile.index.x == target.index.x + 1 && tile.index.y == target.index.y - 1
}