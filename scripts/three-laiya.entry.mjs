// Lo único de Three.js que usa el orbe de LAIYA. `npm run vendor:three`
// empaqueta solo esto en js/vendor/three.laiya.min.js: el árbol entero de
// three.module.js pesa más de 1 MB y la capa no necesita casi nada de él.
// Si js/laiya-avatar.js importa una clase nueva, se añade aquí y se vuelve a
// ejecutar el script.
export {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Points,
  LineSegments,
  Group,
  Color,
  AdditiveBlending,
  ColorManagement,
} from 'three';
