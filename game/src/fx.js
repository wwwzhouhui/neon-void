// Short-lived visual effects: hitscan tracers, spark / explosion particles
// and the muzzle flash light. Everything is pooled so combat never allocates.
import * as THREE from 'three';

export function createEffects(scene) {
  const tracers = [];
  const particles = [];
  const flash = new THREE.PointLight(0xffffff, 0, 14, 1.8);
  scene.add(flash);

  const tracerGeo = new THREE.BufferGeometry();
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));

  function spawnTracer(from, to, color) {
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(tracerGeo.clone(), material);
    const positions = line.geometry.attributes.position.array;
    positions[0] = from.x; positions[1] = from.y; positions[2] = from.z;
    positions[3] = to.x; positions[4] = to.y; positions[5] = to.z;
    line.geometry.attributes.position.needsUpdate = true;
    line.frustumCulled = false;
    scene.add(line);
    tracers.push({ line, life: 0.09, maxLife: 0.09 });
  }

  const particleGeo = new THREE.TetrahedronGeometry(0.09);
  function spawnBurst(position, color, count, speed, life = 0.55) {
    for (let i = 0; i < count; i++) {
      if (particles.length > 160) return;
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(particleGeo, material);
      mesh.position.copy(position);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const v = speed * (0.4 + Math.random() * 0.8);
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * v,
        Math.abs(Math.cos(phi)) * v * 0.9 + 1.5,
        Math.sin(phi) * Math.sin(theta) * v,
      );
      scene.add(mesh);
      particles.push({ mesh, velocity, life, maxLife: life });
    }
  }

  function muzzleFlash(position) {
    flash.position.copy(position);
    flash.position.y += 0.05;
    flash.intensity = 26;
  }

  function update(dt) {
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        scene.remove(t.line);
        t.line.material.dispose();
        t.line.geometry.dispose();
        tracers.splice(i, 1);
      } else {
        t.line.material.opacity = 0.95 * (t.life / t.maxLife);
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= 14 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.velocity.y *= -0.4;
        p.velocity.x *= 0.7;
        p.velocity.z *= 0.7;
      }
      p.mesh.material.opacity = p.life / p.maxLife;
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 8;
    }
    if (flash.intensity > 0) flash.intensity = Math.max(0, flash.intensity - dt * 260);
  }

  function clear() {
    for (const t of tracers) {
      scene.remove(t.line);
      t.line.material.dispose();
      t.line.geometry.dispose();
    }
    tracers.length = 0;
    for (const p of particles) {
      scene.remove(p.mesh);
      p.mesh.material.dispose();
    }
    particles.length = 0;
    flash.intensity = 0;
  }

  return { spawnTracer, spawnBurst, muzzleFlash, update, clear };
}
