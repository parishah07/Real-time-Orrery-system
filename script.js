import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.110.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.110.0/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const video = document.createElement('video');
video.src = 'movingspace.mp4';
video.loop = true;
video.muted = true;
video.playsInline = true;
video.autoplay = true;
video.play();

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBFormat;
scene.background = videoTexture;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 10, 30);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let sunMesh;
let speed = 1;

document.getElementById('speed').addEventListener('input', function(event) {
    speed = parseFloat(event.target.value);
    document.getElementById('speed-value').innerText = speed + 'x';
});

fetch('data.json')
    .then(response => response.json())
    .then(planets => {
        planets.forEach(planetData => {
            const planetGeometry = new THREE.SphereGeometry(planetData.sphereRadius, 32, 32);
            const planetTexture = new THREE.TextureLoader().load(planetData.path);
            const planetMaterial = new THREE.MeshBasicMaterial({ map: planetTexture });
            const planet = new THREE.Mesh(planetGeometry, planetMaterial);

            // Create label canvas for planet
            const labelCanvas = document.createElement('canvas');
            const context = labelCanvas.getContext('2d');

            // Smaller canvas for clearer label without background
            labelCanvas.width = 128;
            labelCanvas.height = 64;

            // Set smaller font size (2x smaller) and remove background
            context.font = 'bold 10px Arial'; // Smaller font size
            context.fillStyle = 'white'; // White text color
            context.fillText(planetData.name, 10, 40); // Text position inside the canvas

            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture });
            const label = new THREE.Sprite(labelMaterial);

            // Scale down the label size so it's smaller than the planets
            label.scale.set(1, 0.5, 1); // Adjusted to half the original size
            label.position.set(0, -(planetData.sphereRadius * 1.5), 0); // Position below the planet

            planet.add(label);

            if (planetData.name == "Saturn") {
                const ringInnerRadius = planetData.sphereRadius + 0.01;
                const ringOuterRadius = ringInnerRadius + 0.1;
                const ringTexture = new THREE.TextureLoader().load('textures/ring.png');
                const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 64);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    map: ringTexture,
                    side: THREE.DoubleSide,
                    transparent: true
                });
                const rings = new THREE.Mesh(ringGeometry, ringMaterial);
                rings.rotation.x = Math.PI / 2;
                planet.add(rings);
            }

            if (planetData.name === 'Mercury') {
                sunMesh = planet;
            }

            scene.add(planet);

            if (planetData.center === "Sun") {
                const eccentricity = planetData.eccentricity;
                const orbitRadiusX = planetData.orbitRadiusX;
                const orbitRadiusY = orbitRadiusX * Math.sqrt(1 - Math.pow(eccentricity, 2));

                if (planetData.name !== "Sun") {
                    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadiusX, orbitRadiusY, 0, 2 * Math.PI, false);
                    const points = orbitCurve.getPoints(100);
                    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
                    let orbitMaterial;
                    if (["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"].includes(planetData.name)) {
                        orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
                    } else {
                        orbitMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
                    }
                    const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
                    orbit.rotation.x = Math.PI / 2;
                    scene.add(orbit);
                }

                let angle = planetData.angle;

                function animate() {
                    requestAnimationFrame(animate);
                    planet.rotation.y += planetData.rotationSpeed * 0.01 * speed;
                    angle += planetData.revolutionSpeed * 0.01 * speed;
                    const x = orbitRadiusX * Math.cos(angle);
                    const z = orbitRadiusY * Math.sin(angle);
                    planet.position.set(x, 0, z);
                    controls.update();
                    renderer.render(scene, camera);
                }
                animate();
            } else {
                let center_name = planetData.center;
                let center_revolution;
                let center_x;
                let center_y;
                let center_e;
                let center_angle;

                fetch('data.json')
                    .then(response => response.json())
                    .then(planets => {
                        planets.forEach(planet => {
                            if (planet.name == center_name) {
                                center_angle = planet.angle;
                                center_e = planet.eccentricity;
                                center_y = planet.orbitRadiusX * Math.sqrt(1 - Math.pow(planet.eccentricity, 2));
                                center_x = planet.orbitRadiusX;
                                center_revolution = planet.revolutionSpeed;
                            }
                        });
                    });

                const moonGeometry = new THREE.SphereGeometry(planetData.sphereRadius, 32, 32);
                const moonTexture = new THREE.TextureLoader().load(planetData.path);
                const moonMaterial = new THREE.MeshBasicMaterial({ map: moonTexture });
                const moon = new THREE.Mesh(moonGeometry, moonMaterial);
                scene.add(moon);

                let angle = planetData.angle;
                const orbitRadiusX = planetData.orbitRadiusX;
                const orbitRadiusY = orbitRadiusX * Math.sqrt(1 - Math.pow(planetData.eccentricity, 2));

                function animate() {
                    requestAnimationFrame(animate);
                    moon.rotation.y += planetData.rotationSpeed * 0.01 * speed;
                    angle += planetData.revolutionSpeed * 0.01 * speed;
                    const x = (center_x * Math.cos(center_angle)) + (orbitRadiusX * Math.cos(angle));
                    const z = (center_y * Math.sin(center_angle)) + (orbitRadiusY * Math.sin(angle));
                    center_angle += center_revolution * 0.01 * speed;
                    moon.position.set(x, 0, z);
                    controls.update();
                    renderer.render(scene, camera);
                }
                animate();
            }
        });
    });

window.addEventListener('click', onClick, false);

function onClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(sunMesh);
    if (intersects.length > 0) {
        displayPopup();
    }
}

function displayPopup() {
    const popup = document.getElementById('popup');
    popup.style.display = 'block';
}

function closePopup() {
    const popup = document.getElementById('popup');
    popup.style.display = 'none';
}

window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});