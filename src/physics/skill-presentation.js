// Read-only presentation of the compiled MuJoCo model and current data.
// Rendering never writes robot, prop, rope, contact or recurrent state.
export function skillPresentation(world) {
  const { model: m, mj } = world;
  const visibleBodies = new Set();
  for (let id = 0; id < m.ngeom; id++) if (m.geom_group[id] === 2) visibleBodies.add(m.geom_bodyid[id]);
  const meshes = [], meshIds = new Map(), geoms = [], textures = [], textureIds = new Map();
  const names = ['plane','sphere','capsule','ellipsoid','cylinder','box','mesh'];
  const types = names.map(name => mj.mjtGeom['mjGEOM_' + name.toUpperCase()].value);
  for (let id = 0; id < m.ngeom; id++) {
    if (m.geom_group[id] !== 2 && m.geom_group[id] !== 0 && visibleBodies.has(m.geom_bodyid[id])) continue;
    const type = names[types.indexOf(m.geom_type[id])];
    if (!type) continue;
    let mesh = null;
    if (type === 'mesh') {
      const source = m.geom_dataid[id];
      if (!meshIds.has(source)) {
        const start = m.mesh_vertadr[source], count = m.mesh_vertnum[source];
        const face = m.mesh_faceadr[source], faces = m.mesh_facenum[source];
        const indices = new Uint32Array(m.mesh_face.slice(face * 3, (face + faces) * 3));
        if (indices.some(index => index >= count)) throw new Error('Invalid compiled mesh indices');
        meshIds.set(source, meshes.length);
        const geometry = { positions: new Float32Array(m.mesh_vert.slice(start * 3, (start + count) * 3)), indices };
        if (m.mesh_texcoordnum[source] > 0) {
          // OBJ positions and UVs have separate face indices. Expand only
          // textured meshes so seams retain the exact compiled UV mapping.
          const positions = new Float32Array(indices.length * 3), uvs = new Float32Array(indices.length * 2), normals = new Float32Array(indices.length * 3);
          const uvStart = m.mesh_texcoordadr[source], normalStart = m.mesh_normaladr[source];
          for (let i = 0; i < indices.length; i++) {
            positions.set(geometry.positions.subarray(indices[i] * 3, indices[i] * 3 + 3), i * 3);
            const uv = m.mesh_facetexcoord[face * 3 + i], normal = m.mesh_facenormal[face * 3 + i];
            if (uv < 0 || uv >= m.mesh_texcoordnum[source]) throw new Error('Invalid compiled mesh UV');
            uvs.set(m.mesh_texcoord.subarray((uvStart + uv) * 2, (uvStart + uv) * 2 + 2), i * 2);
            normals.set(m.mesh_normal.subarray((normalStart + normal) * 3, (normalStart + normal) * 3 + 3), i * 3);
          }
          Object.assign(geometry, { positions, indices: null, uvs, normals });
        }
        meshes.push(geometry);
      }
      mesh = meshIds.get(source);
    }
    const material = m.geom_matid[id];
    const rgba = material >= 0 ? m.mat_rgba.slice(material * 4, material * 4 + 4) : m.geom_rgba.slice(id * 4, id * 4 + 4);
    let texture = null;
    if (material >= 0 && type !== 'plane') {
      const roles = mj.mjtTextureRole.mjNTEXROLE.value;
      const source = m.mat_texid[material * roles + mj.mjtTextureRole.mjTEXROLE_RGB.value];
      if (source >= 0) {
        if (!textureIds.has(source)) {
          const width = m.tex_width[source], height = m.tex_height[source], channels = m.tex_nchannel[source], start = Number(m.tex_adr[source]);
          textureIds.set(source, textures.length);
          textures.push({ width, height, channels, linear: m.tex_colorspace[source] === mj.mjtColorSpace.mjCOLORSPACE_LINEAR.value,
            pixels: new Uint8Array(m.tex_data.slice(start, start + width * height * channels)) });
        }
        texture = textureIds.get(source);
      }
    }
    geoms.push({ id, type, mesh, texture, size: [...m.geom_size.slice(id * 3, id * 3 + 3)], rgba: [...rgba] });
  }
  const ropeSites = ['swing_anchor_left','swing_attach_left','swing_anchor_right','swing_attach_right'].map(name =>
    mj.mj_name2id(m, mj.mjtObj.mjOBJ_SITE.value, 'robot/' + name));
  return { meshes, textures, geoms, ropeSites: ropeSites.every(id => id >= 0) ? ropeSites : [] };
}

export function skillFrame(world, presentation) {
  const poses = new Float32Array(presentation.geoms.length * 12);
  presentation.geoms.forEach(({id}, i) => {
    poses.set(world.data.geom_xpos.subarray(id * 3, id * 3 + 3), i * 12);
    poses.set(world.data.geom_xmat.subarray(id * 9, id * 9 + 9), i * 12 + 3);
  });
  return { poses, sites: Float32Array.from(presentation.ropeSites.flatMap(id => [...world.data.site_xpos.slice(id * 3, id * 3 + 3)])),
    time: world.time, root: world.state().position };
}
