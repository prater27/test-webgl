import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Game } from "./Game";
import { MOUSE, Mesh, MeshBasicMaterial, SphereGeometry, Vector2, Vector3 } from "three";
import Tile from "./Tile";
import { Actions, TileStatus } from "../utils/Enums";
import { getColorByTeamIndex, getRandomIntInRange, getTileFromRaycast } from "../utils/Utils";
import WorldMap from "./WorldMap";
import anime from 'animejs';
import { Player } from "./Player";
import { Unit } from "./Unit";

const MOVEMENT = 4;
let daytime = true;
let animating = false;

export class Controls {
  game: Game;
  orbitControls: OrbitControls;
  currentMap: WorldMap;
  selectedTile: Tile;
  selectedAction: Actions = Actions.SELECT_TILE;
  currentPath: Array<Tile>;
  currentPlayer: Player;

  constructor(game: Game) {
    this.game = game;
    this.orbitControls = new OrbitControls(game.camera, game.renderer.domElement);
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.enableDamping = true;
    this.orbitControls.listenToKeyEvents(window)
    this.orbitControls.mouseButtons = {
      LEFT: 0,
      MIDDLE: MOUSE.ROTATE,
      RIGHT: 0,
    }
    this.currentPlayer = this.game.players[0];
  }
  update(): void {
    this.orbitControls.update();
  }
  setMap(currentMap: WorldMap): void {
    this.currentMap = currentMap;
    this.spawnUnit(currentMap, 0);
    this.spawnUnit(currentMap, 0);
    this.spawnUnit(currentMap, 0);
    this.spawnUnit(currentMap, 1);
    this.spawnUnit(currentMap, 1);
    this.spawnUnit(currentMap, 1);
    this.spawnUnit(currentMap, 2);
    this.spawnUnit(currentMap, 2);
    this.spawnUnit(currentMap, 2);
    this.spawnUnit(currentMap, 3);
    this.spawnUnit(currentMap, 3);
    this.spawnUnit(currentMap, 3);
    this.spawnUnit(currentMap, 4);
    this.spawnUnit(currentMap, 4);
    this.spawnUnit(currentMap, 4);
  }
  handlePointerMove(event: PointerEvent): void {
    this.game.scene.children.forEach((element) => {
      if (element.userData instanceof Tile) {
        if (element.userData.status == TileStatus.HOVERED) {
          element.userData.setTileStatus(TileStatus.NORMAL, true);
        } else if (element.userData.status == TileStatus.TARGET) {
          element.userData.setTileStatus(TileStatus.REACHABLE, true);
        }
      }
    })
    const hoveredMesh = getTileFromRaycast(event, this.game);
    let hovered = hoveredMesh as Tile
    if (!(hovered instanceof Tile) || (hovered.hasObstacle && !hovered.unit)) return;
    if (hovered.status == TileStatus.REACHABLE || hovered.status == TileStatus.PATH) {
      this.currentMap.applyStatusToTiles(TileStatus.PATH, TileStatus.REACHABLE);
      hovered.setTileStatus(TileStatus.TARGET);
      this.currentPath = this.currentMap.pathfinding.findPath(this.selectedTile, hovered, 2)
      this.currentPath.forEach(element => {
        element.setTileStatus(TileStatus.PATH)
      });
    } else {
      hovered.setTileStatus(TileStatus.HOVERED);
      this.currentPath = [];
      this.currentMap.applyStatusToTiles(TileStatus.PATH, TileStatus.REACHABLE)
    }
  }
  handleMouseDown(event: MouseEvent): void {
    if (event.which == 1) {
      const originTile = this.selectedTile;
      this.selectedTile = getTileFromRaycast(event, this.game);
      if (originTile && originTile instanceof Tile) {
        originTile.setTileStatus(TileStatus.NORMAL, true);
        this.currentMap.applyStatusToTiles(TileStatus.REACHABLE, TileStatus.NORMAL);
      };
      if (this.selectedTile instanceof Tile) {
        if (this.selectedAction == Actions.MOVE_UNIT && this.selectedTile.status == TileStatus.TARGET) {
          this.game.moveUnitMeshToTile(this.currentPath);
          this.currentMap.moveUnitToTile(originTile, this.selectedTile);
          const attackZone = this.currentMap.pathfinding.getTileNeighbors(this.selectedTile, MOVEMENT, true);
          attackZone.forEach((tile: Tile) => {
            if (tile.unit && tile.unit.team != this.selectedTile.unit?.team) {
              this.game.cleanUnitMesh(tile.unit.id as string);
              this.currentMap.removeUnit(tile);
            }
          })
          this.currentMap.clearStatusFromAllTiles();
          this.selectedAction = Actions.SELECT_TILE;
          return;
        }
        else if (this.selectedAction == Actions.SELECT_TILE && this.selectedTile.unit && this.selectedTile.unit.team == this.currentPlayer.team) {
          this.selectedTile.setTileStatus(TileStatus.SELECTED);
          const reachables = this.currentMap.pathfinding.getReachables(this.selectedTile, MOVEMENT, 2);
          reachables.forEach((reachable) => {
            reachable.setTileStatus(TileStatus.REACHABLE);
          })
          this.selectedAction = Actions.MOVE_UNIT;
        } else {
          this.selectedAction = Actions.SELECT_TILE;
        }
      }
    }
  }
  handleKeyDown(event: KeyboardEvent): boolean {
    let sunBackground: HTMLElement = document.querySelector(".sun-background") as HTMLElement;
    let moonBackground: HTMLElement = document.querySelector(".moon-background") as HTMLElement;
    switch (event.key) {
      case 'Escape':
        this.game.quitGame();
        break;
      case 'r':
        this.game.cleanScene();
        let size = getRandomIntInRange(16, 30)
        let seaLevel = getRandomIntInRange(0, 5)
        let maxHeight = getRandomIntInRange(5, 10)
        let minHeight = getRandomIntInRange(0, 5);
        console.log({ size, seaLevel, maxHeight, minHeight })
        return true;

      case 'Enter':
        this.currentPlayer = this.game.players[0];
        if (animating) return false;
        let anim;
        if (!daytime) {
          anim = [1, 0];
        } else {
          anim = [0, 1];
        }
        animating = true;
        let obj = { t: 0 };
        anime({
          targets: obj,
          t: anim,
          complete: () => {
            animating = false;
            daytime = !daytime;
          },
          update: () => {
            this.game.sunLight.intensity = 3.5 * (1 - obj.t);
            this.game.moonLight.intensity = 3.5 * obj.t;

            this.game.sunLight.translateY(20 * (1 - obj.t));
            this.game.moonLight.translateY(20 * obj.t);

            sunBackground.style.opacity = Number(1 - obj.t).toString();
            moonBackground.style.opacity = Number(obj.t).toString();
          },
          easing: 'easeInOutSine',
          duration: 500,
        })
        break;
      default:
        break;
    }
    return false;
  }
  spawnUnit(currentMap: WorldMap, team: number){
    let randomTile = currentMap.getRandomNonObstacleTileForTeam(team);
    if (randomTile.height == -99) randomTile = currentMap.getRandomNonObstacleTileForTeam(team);
    const position: Vector3 = this.game.getMeshById(randomTile.id)['position']
    this.createUnit(randomTile, team, new Vector2(position.x, position.z))
  }
  createUnit(tile: Tile, team: number, position: Vector2): void {
    tile.unit = new Unit(team, 'unit', 30);
    tile.hasObstacle = true;
    let geo = new SphereGeometry(.5);

    const color = getColorByTeamIndex(team);
    let mesh = new Mesh(geo, new MeshBasicMaterial({ color }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Tile';
    mesh['position'].set(position.x, tile.height + .5, position.y);
    mesh.userData = {
      pendingMovements: []
    }
    tile.unit.id = mesh.uuid;
    this.game.scene.add(mesh);
  }
}