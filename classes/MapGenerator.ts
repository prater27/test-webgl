import { createNoise2D } from 'simplex-noise';
import Tile from './Tile';
import WorldMap from './WorldMap';
import { Vector2, CylinderGeometry, Color, SphereGeometry, Mesh, MeshPhysicalMaterial, Scene, DoubleSide, TextureLoader, MeshStandardMaterial, MeshBasicMaterial, Texture, BoxGeometry, BufferGeometry } from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';
import Alea from 'alea';
import { MapShape, TerrainType, TextureType } from '../utils/Enums';
import { tileToPosition } from '../utils/Utils';

const STONE_CONSTANT = .8;
const DIRT_CONSTANT = .7;
const GRASS_CONSTANT = .5;
const SAND_CONSTANT = .3;

const STONE_TEXTURE: Texture = await new TextureLoader().loadAsync("assets/textures/stone.png");
const DIRT_TEXTURE: Texture = await new TextureLoader().loadAsync("assets/textures/dirt.png");
const GRASS_TEXTURE: Texture = await new TextureLoader().loadAsync("assets/textures/grass.jpg");
const SAND_TEXTURE: Texture = await new TextureLoader().loadAsync("assets/textures/sand.jpg");
const DIRT2_TEXTURE: Texture = await new TextureLoader().loadAsync("assets/textures/dirt2.jpg");
const WATER_TEXTURE: Texture = await new TextureLoader().loadAsync("assets/textures/water.jpg");
export default class MapGenerator {
  envmap: Texture;
  scene: Scene;
  constructor(envmap: Texture, scene: Scene) {
    this.envmap = envmap;
    this.scene = scene;
  }
  createMap(shape: MapShape = MapShape.BOX, terrain: TerrainType, size: number = 16, seaLevel: number = 3, maxHeight: number = 10, minHeight: number = 0, seed?: string): WorldMap {
    if (!seed) seed = window.crypto.randomUUID();
    console.log({ size, seaLevel, maxHeight, minHeight, seed })
    const noise2D = createNoise2D(Alea(seed));
    const map = new WorldMap(shape, size, seaLevel, maxHeight);
    const tiles: Array<Tile> = [];
    const start = (shape == MapShape.CIRCLE ? 1 - size : 0);
    for (let i = start; i < size; i++) {
      for (let j = start; j < size; j++) {
        const position = tileToPosition(i, j, shape, size);
        if (shape == MapShape.CIRCLE && position.length() > size) continue;
        else if (shape == MapShape.BOX && i >= size && j >= size) continue;
        let noise = (noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
        noise = Math.pow(noise, 1.5);

        const height = Math.min(Math.round((noise * maxHeight) + minHeight - seaLevel), maxHeight);
        if (height <= 0) continue;

        const tile = new Tile(new Vector2(i, j), height);
        const textureType = this.getRandomTexture(terrain, height, maxHeight);
        tile.texture = textureType;
        this.populateWorld(textureType, tile, height, position);
        tiles.push(tile);

        const mesh = this.createTile(tile, this.createMaterial(textureType), position);
        this.scene.add(mesh);
      }
    }
    map.setTiles(tiles);
    this.createSea(shape, size, seaLevel);
    this.createContainer(shape, size, seaLevel);
    this.createFloor(shape, size, seaLevel);
    this.createClouds(Math.floor(Math.pow(Math.random(), .45) * size / 3), size);

    return map;
  }
  createTile(tile: Tile, material: MeshPhysicalMaterial, position: Vector2): Mesh {
    const geo = new CylinderGeometry(1, 1, tile.height, 6, 1, false);

    const mesh = new Mesh(geo, material as unknown as MeshBasicMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Tile';
    mesh.userData = tile;
    mesh['position'].set(position.x, tile.height * 0.5, position.y);
    tile.id = mesh.uuid;

    return mesh;
  }
  createMaterial(textureType: TextureType): MeshPhysicalMaterial {
    const map = this.getTextureFromTextureType(textureType);
    const material = new MeshPhysicalMaterial({
      envMap: this.envmap,
      envMapIntensity: 0.135,
      flatShading: true,
      map
    });

    return material;
  }
  createSea(shape: MapShape, size: number, seaLevel: number): void {
    if (seaLevel == 0) return
    const texture = this.getTextureFromTextureType(TextureType.WATER_TEXTURE);
    let geo: BufferGeometry;
    if (shape == MapShape.CIRCLE) {
      geo = new CylinderGeometry(size + 1, size + 1, seaLevel - .1, 50);
      geo.translate(0, -.5, 0)
    } else {
      geo = new BoxGeometry(size * 2 - 2, seaLevel - .1, size * 2 - 6);
      geo.translate(-.5, -.5, -.5)
    }
    const seaMesh: Mesh = new Mesh(
      geo,
      new MeshPhysicalMaterial({
        envMap: this.envmap,
        color: new Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
        ior: 1.4,
        transmission: 1,
        transparent: true,
        thickness: 1.5,
        envMapIntensity: 0.2,
        roughness: 1,
        metalness: 0.025,
        roughnessMap: texture,
        metalnessMap: texture,
      }) as unknown as MeshBasicMaterial
    );
    seaMesh.receiveShadow = true;
    seaMesh.name = "Container";
    this.scene.add(seaMesh);
  }
  createContainer(shape: MapShape, size: number, seaLevel: number): void {
    let geo: BufferGeometry;
    if (shape == MapShape.CIRCLE) {
      geo = new CylinderGeometry(size + 1.1, size + 1.1, Math.max(seaLevel + 1, 2.8), 50);
      geo.translate(0, -1.5, 0)
    } else {
      geo = new BoxGeometry(size * 2, Math.max(seaLevel + 1, 2.8), size * 2 - 4);
      geo.translate(-.5, -1.5, -.5)
    }
    if (seaLevel == 0) geo.translate(0, 1, 0)
    const mapContainer = new Mesh(
      geo,
      new MeshPhysicalMaterial({
        envMap: this.envmap,
        map: this.getTextureFromTextureType(TextureType.DIRT_TEXTURE),
        envMapIntensity: 0.2,
        side: DoubleSide,
      }) as unknown as MeshBasicMaterial
    );
    mapContainer.receiveShadow = true;
    mapContainer.name = "Container";
    this.scene.add(mapContainer);
  }
  createFloor(shape: MapShape, size: number, seaLevel: number): void {
    let geo: BufferGeometry;
    if (shape == MapShape.CIRCLE) {
      geo = new CylinderGeometry(size + 1, size + 1, 1, 50);
      geo.translate(0, -(seaLevel + 2.5 - seaLevel / 2), 0)
    } else {
      geo = new BoxGeometry(size * 2 - 1, 1, size * 2 - 5);
      geo.translate(-.5, -(seaLevel + 2.5 - seaLevel / 2), -.5)
    }
    const mapFloor = new Mesh(
      geo,
      new MeshPhysicalMaterial({
        envMap: this.envmap,
        map: this.getTextureFromTextureType(TextureType.DIRT2_TEXTURE),
        envMapIntensity: 0.1,
        side: DoubleSide,
      }) as unknown as MeshBasicMaterial
    );
    mapFloor.receiveShadow = true;
    mapFloor.name = "Container";
    this.scene.add(mapFloor);
  }
  createTree(height: number, position: Vector2): void {
    const treeHeight = Math.random() * 1 + 1.25;

    const geo1 = new CylinderGeometry(0, 1.5, treeHeight, 3);
    geo1.translate(position.x, height + treeHeight * 0 + 1, position.y);
    const geo2 = new CylinderGeometry(0, 1.15, treeHeight, 3);
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);
    const geo3 = new CylinderGeometry(0, 0.8, treeHeight, 3);
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);

    const geo = BufferGeometryUtils.mergeGeometries([geo1, geo2, geo3]);
    const mesh = new Mesh(
      geo,
      new MeshPhysicalMaterial({
        envMap: this.envmap,
        envMapIntensity: 0.75,
        flatShading: true,
        map: this.getTextureFromTextureType(TextureType.GRASS_TEXTURE)
      }) as unknown as MeshBasicMaterial
    );
    mesh.name = "Tree";
    this.scene.add(mesh);
  }
  createStone(height: number, position: Vector2, count: number): void {
    const geos: Array<SphereGeometry> = [];
    for (let i = 0; i < count; i++) {
      const geo1 = new SphereGeometry(Math.random() * .4 + .3, 7, 7, 0, Math.PI * 2, 0, Math.PI / 2);
      const displacementX = Math.random() * .5 * (Math.round(Math.random()) ? 1 : -1);
      const displacementY = Math.random() * .5 * (Math.round(Math.random()) ? 1 : -1);
      geo1.translate(position.x + displacementX, height, position.y + displacementY);
      geos.push(geo1);
    }
    const geo = BufferGeometryUtils.mergeGeometries(geos) as SphereGeometry;
    const mesh = new Mesh(
      geo,
      new MeshPhysicalMaterial({
        envMap: this.envmap,
        envMapIntensity: 0.75,
        flatShading: true,
        map: this.getTextureFromTextureType(TextureType.STONE_TEXTURE),
      }) as unknown as MeshBasicMaterial
    );
    mesh.name = "Stone";
    this.scene.add(mesh);
  }
  createClouds(count: number, mapSize: number): void {
    let geo = new SphereGeometry(0, 0, 0);
    for (let i = 0; i < count; i++) {
      const puff1 = new SphereGeometry(1.2, 7, 7);
      const puff2 = new SphereGeometry(1.5, 7, 7);
      const puff3 = new SphereGeometry(.9, 7, 7);

      puff1.translate(-1.85, Math.random() * .3, 0);
      puff2.translate(0, Math.random() * .3, 0);
      puff3.translate(1.85, Math.random() * .3, 0);

      const cloudGeo = BufferGeometryUtils.mergeGeometries([puff1, puff2, puff3]);
      cloudGeo.translate(
        Math.random() * mapSize - 10,
        Math.random() * 4 + 15,
        Math.random() * mapSize - 10,
      );
      cloudGeo.rotateY(Math.random() * Math.PI * 2);
      geo = BufferGeometryUtils.mergeGeometries([geo, cloudGeo]) as SphereGeometry;
    }

    const mesh = new Mesh(
      geo,
      new MeshStandardMaterial({
        envMap: this.envmap,
        envMapIntensity: .75,
        flatShading: true,
      }) as unknown as MeshBasicMaterial
    );
    mesh.name = "Cloud";
    this.scene.add(mesh);
  }
  getRandomTexture(terrainType: TerrainType, height: number, maxHeight: number): TextureType {
    const palette = this.getTexturePaletteFromTerrainType(terrainType);
    if (height > STONE_CONSTANT * maxHeight) {
      return palette[0];
    } else if (height > DIRT_CONSTANT * maxHeight) {
      return palette[1];
    } else if (height > GRASS_CONSTANT * maxHeight) {
      return palette[2];
    } else if (height > SAND_CONSTANT * maxHeight) {
      return palette[3];
    } else
      return TextureType.DIRT2_TEXTURE;
  }
  getTexturePaletteFromTerrainType(terrainType: TerrainType): Array<TextureType> {
    switch (terrainType) {
      case TerrainType.FOREST:
      case TerrainType.ISLAND:
      case TerrainType.MOUNTAIN:
      case TerrainType.PLAINS:
      case TerrainType.SWAMP:
      case TerrainType.DESERT:
      default:
        return [
          TextureType.STONE_TEXTURE,
          TextureType.DIRT_TEXTURE,
          TextureType.GRASS_TEXTURE,
          TextureType.SAND_TEXTURE,
        ]
    }
  }
  getTextureFromTextureType(textureType: TextureType): Texture {
    switch (textureType) {
      case TextureType.STONE_TEXTURE:
        return STONE_TEXTURE;
      case TextureType.DIRT_TEXTURE:
        return DIRT_TEXTURE;
      case TextureType.GRASS_TEXTURE:
        return GRASS_TEXTURE;
      case TextureType.SAND_TEXTURE:
        return SAND_TEXTURE;
      case TextureType.DIRT2_TEXTURE:
        return DIRT2_TEXTURE;
      case TextureType.WATER_TEXTURE:
        return WATER_TEXTURE;
    }
  }
  populateWorld(textureType: TextureType, tile: Tile, height: number, position: Vector2): void {
    const random = Math.random();
    if (random > 0.8) {
      switch (textureType) {
        case (TextureType.SAND_TEXTURE):
        case (TextureType.STONE_TEXTURE):
          this.createStone(Math.round(height), position, Math.floor(Math.pow(Math.random(), .45) * 3 + 1));
          tile.hasObstacle = true;
          break;
        case (TextureType.DIRT_TEXTURE):
        case (TextureType.GRASS_TEXTURE):
          this.createTree(Math.round(height), position);
          tile.hasObstacle = true;
          break;
      }
    }
  }
}
