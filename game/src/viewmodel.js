import * as THREE from 'three';
// A readable two-weapon silhouette anchors the FPS screenshots and weapon switch.
export function createWeaponView(camera) {
  const root = new THREE.Group();
  root.position.set(0.32, -0.30, -0.65);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.18, 0.5), new THREE.MeshBasicMaterial({color: 0x162c46}));
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.36), new THREE.MeshBasicMaterial({color: 0x00f0ff}));
  barrel.position.z = -0.35;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.38), new THREE.MeshBasicMaterial({color: 0x00f0ff}));
  stripe.position.y = 0.075;
  root.add(body, barrel, stripe); camera.add(root);
  return { update(player, now, visible, reducedMotion) {
    root.visible = visible;
    const shotgun = player.currentWeapon === 'shotgun';
    body.scale.x = shotgun ? 1.4 : 1;
    barrel.material.color.setHex(shotgun ? 0xffb300 : 0x00f0ff);
    stripe.material.color.copy(barrel.material.color);
    const moving = Math.hypot(player.velocity.x, player.velocity.z) > 1;
    root.position.y = -0.30 + (reducedMotion || !moving ? 0 : Math.sin(now * 11) * 0.008);
    root.rotation.x = player.reloading ? -0.35 : 0;
  }};
}
