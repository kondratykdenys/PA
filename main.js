'use strict';

let gl;                         // The webgl context.
let surface, webcamSurf;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let texture, video, track, camera;

function deg2rad(angle) {
  return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;
  this.countTexture = 0;

  this.BufferData = function(vertices, textures) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;

    if (textures != null) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

      this.countTexture = textures.length / 2;
    }
  }

  this.Draw = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribTexture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    gl.uniform1f(shProgram.iFill, 2);
    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
  }
  this.DrawWebCam = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribTexture);

    gl.uniform1f(shProgram.iFill, -11);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);

  }
}


// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  this.iAttribTexture = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  this.iTMU = -1;

  this.Use = function() {
    gl.useProgram(this.prog);
  }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.orthographic(-4, 4, -4, 4, 0, 4 * 4);

  let tilt1 = m4.axisRotation([0.0, 1.0, 0.0], -Math.PI / 2.0 * sensor.x / 10.0);
  let tilt2 = m4.axisRotation([1.0, 0.0, 0.0], Math.PI / 2.0 * sensor.y / 10.0);
  let tiltMat = m4.multiply(tilt1, tilt2);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);
  let translateToPointZero = m4.translation(0, 0, -10);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  let matAccumAcc = m4.multiply(matAccum1, tiltMat);

  camera.readspans();

  camera.ApplyLeftFrustum();
  let modelLeft = camera.mModelViewMatrix;
  let projLeft = camera.mProjectionMatrix;
  // let modelL0 = m4.multiply(matAccumAcc, modelLeft)
  let modelL0 = modelLeft


  let translateWebCam = m4.translation(1.5, 1.5, 0);
  let rotateWebCam = m4.zRotation(Math.PI);
  let webCamMat = m4.multiply(translateWebCam, m4.multiply(translateWebCam, rotateWebCam))
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(webCamMat, m4.scaling(6, 6, 6)));
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, m4.multiply(projection, rotateWebCam));
  gl.uniform1i(shProgram.iTMU, 0);
  gl.enable(gl.TEXTURE_2D);
  applyTexture();
  webcamSurf.DrawWebCam();
  // gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelL0);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projLeft);
  gl.uniform1f(shProgram.iFill, 1);
  // console.log(projLeft)
  gl.colorMask(true, false, false, false);

  gl.clear(gl.DEPTH_BUFFER_BIT);
  surface.Draw();
  gl.uniform1f(shProgram.iFill, 1);
  camera.ApplyRightFrustum();
  let modelRight = camera.mModelViewMatrix;
  let projRight = camera.mProjectionMatrix;
  // let modelR0 = m4.multiply(matAccumAcc, modelRight)
  let modelR0 = modelRight
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelR0);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projRight);
  // console.log(projRight);
  gl.colorMask(false, true, true, false);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  surface.Draw();

  gl.colorMask(true, true, true, true);
  let matAccTrans = m4.translation(0.5 * sensor.x * 0.5, 0.5 * sensor.y * 0.5, (-0.5) * sensor.z * 0.5);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(modelR0, matAccTrans));
  if (audioPanner) {
    audioPanner.setPosition(0.5 * sensor.x * 0.5, 0.5 * sensor.y * 0.5, (-0.5) * sensor.z * 0.5);
  }
  sphere.Draw();

}
function live() {
  draw();
  window.requestAnimationFrame(live)
}
function applyTexture() {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    video
  );
}

function CreateSurfaceData() {
  let vertexList = [];
  const uMax = Math.PI * 2
  const vMax = 1;
  const step = 0.1
  for (let v = -vMax; v < vMax; v += step) {
    for (let u = 0; u < uMax; u += step) {
      let v0 = CTSC(u, v)
      let v1 = CTSC(u + step, v)
      let v2 = CTSC(u, v + step)
      let v3 = CTSC(u + step, v + step)
      vertexList.push(v0.x, v0.y, v0.z)
      vertexList.push(v1.x, v1.y, v1.z)
      vertexList.push(v2.x, v2.y, v2.z)

      vertexList.push(v1.x, v1.y, v1.z)
      vertexList.push(v3.x, v3.y, v3.z)
      vertexList.push(v2.x, v2.y, v2.z)
    }
  }

  return vertexList;
}
function CreateSurfaceTextureData() {
  let textureList = [];
  const uMax = Math.PI * 2
  const vMax = 1;
  const step = 0.1
  for (let v = -vMax; v < vMax; v += step) {
    for (let u = 0; u < uMax; u += step) {
      let u1 = map(u, 0, uMax, 0, 1)
      let v1 = map(v, -vMax, vMax, 0, 1)
      textureList.push(u1, v1)
      u1 = map(u + step, 0, uMax, 0, 1)
      textureList.push(u1, v1)
      u1 = map(u, 0, uMax, 0, 1)
      v1 = map(v + step, -vMax, vMax, 0, 1)
      textureList.push(u1, v1)
      u1 = map(u + step, 0, uMax, 0, 1)
      v1 = map(v, -vMax, vMax, 0, 1)
      textureList.push(u1, v1)
      v1 = map(v + step, -vMax, vMax, 0, 1)
      textureList.push(u1, v1)
      u1 = map(u, 0, uMax, 0, 1)
      v1 = map(v + step, -vMax, vMax, 0, 1)
      textureList.push(u1, v1)
    }
  }

  return textureList;
}

function CTSC(u, v) {
  let k = 0.5
  let x = r(u, v) * Math.cos(u)
  let y = r(u, v) * Math.sin(u)
  let z = v
  return { x: k * x, y: k * y, z: k * z }
}

function r(u, v) {
  const a = 3
  let r1 = c(v, 2) * Math.cos(2 * u)
  let r2 = Math.sqrt(Math.pow(a, 4) - c(v, 4) * Math.pow(Math.sin(2 * u), 2))
  return (Math.sqrt(r1 + r2))
}

function c(v, p = 1) {
  return Math.pow(3 * v, p)
}

function CreateSphereSurface(r = 0.05) {
  let vertexList = [];
  let lon = -Math.PI;
  let lat = -Math.PI * 0.5;
  while (lon < Math.PI) {
    while (lat < Math.PI * 0.5) {
      let v1 = sphereSurfaceDate(r, lon, lat);
      let v2 = sphereSurfaceDate(r, lon + 0.05, lat);
      let v3 = sphereSurfaceDate(r, lon, lat + 0.05);
      let v4 = sphereSurfaceDate(r, lon + 0.05, lat + 0.05);
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v2.x, v2.y, v2.z);
      lat += 0.05;
    }
    lat = -Math.PI * 0.5
    lon += 0.05;
  }
  return vertexList;
}

function sphereSurfaceDate(r, u, v) {
  let x = r * Math.sin(u) * Math.cos(v);
  let y = r * Math.sin(u) * Math.sin(v);
  let z = r * Math.cos(u);
  return { x: x, y: y, z: z };
}
let sphere;
/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
  shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
  shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');
  shProgram.iFill = gl.getUniformLocation(prog, 'fill');

  surface = new Model('Surface1');
  // LoadTexture()
  video = document.createElement('video');
  video.setAttribute('autoplay', true);
  window.vid = video;
  getWebcam();
  CreateWebCamTexture();
  camera = new StereoCamera(1, 0.5, 1, 0.8, -10, 50);
  surface.BufferData(CreateSurfaceData(), CreateSurfaceTextureData());

  webcamSurf = new Model('Surface2');
  webcamSurf.BufferData([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0], [1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0]);
  gl.enable(gl.DEPTH_TEST);

  sphere = new Model("Sphere");
  sphere.BufferData(CreateSphereSurface(0.33), CreateSphereSurface(0.33))
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  readAccelerometer()
  startAudio()
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  // draw()
  live();
}

function map(val, f1, t1, f2, t2) {
  let m;
  m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
  return Math.min(Math.max(m, f2), t2);
}

function LoadTexture() {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const image = new Image();
  image.crossOrigin = 'anonymus';

  image.src = "https://raw.githubusercontent.com/kondratykdenys/VGGI/main/%D0%B7%D0%B0%D0%B2%D0%B0%D0%BD%D1%82%D0%B0%D0%B6%D0%B5%D0%BD%D0%BD%D1%8F.jpg";
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );
    console.log("imageLoaded")
    draw()
  }
}

function StereoCamera(
  Convergence,
  EyeSeparation,
  AspectRatio,
  FOV,
  NearClippingDistance,
  FarClippingDistance
) {
  this.mConvergence = Convergence;
  this.mEyeSeparation = EyeSeparation;
  this.mAspectRatio = AspectRatio;
  this.mFOV = FOV;
  this.mNearClippingDistance = NearClippingDistance;
  this.mFarClippingDistance = FarClippingDistance;

  this.mProjectionMatrix = null;
  this.mModelViewMatrix = null;

  this.ApplyLeftFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-b * this.mNearClippingDistance) / this.mConvergence;
    right = (c * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mProjectionMatrix = m4.orthographic(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to right
    this.mModelViewMatrix = m4.translation(
      this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };

  this.ApplyRightFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-c * this.mNearClippingDistance) / this.mConvergence;
    right = (b * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mProjectionMatrix = m4.orthographic(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to left
    this.mModelViewMatrix = m4.translation(
      -this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };

  this.readspans = function() {
    let spans = document.getElementsByClassName("val");
    let eyeSep = 0.7;
    eyeSep = document.getElementById("ES").value;
    spans[0].innerHTML = eyeSep;
    this.mEyeSeparation = eyeSep;
    let ratio = 1.0;
    let fov = 0.8;
    fov = document.getElementById("FOV").value;
    spans[1].innerHTML = fov;
    this.mFOV = fov;
    let nearClip = 5.0;
    nearClip = document.getElementById("NCD").value - 0.0;
    spans[2].innerHTML = nearClip;
    this.mNearClippingDistance = nearClip
    let convergence = 100.0;
    convergence = document.getElementById("C").value;
    spans[3].innerHTML = convergence;
    this.mConvergence = convergence
  }
}

function getWebcam() {
  navigator.getUserMedia({ video: true, audio: false }, function(stream) {
    video.srcObject = stream;
    track = stream.getTracks()[0];
  }, function(e) {
    console.error('Rejected!', e);
  });
}

function CreateWebCamTexture() {
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

let sensor;
function readAccelerometer() {
  sensor = new Accelerometer({ frequency: 60 });
  sensor.start();
}

let audioElement = null;
let audioContext;
let audioSource;
let audioPanner;
let audioFilter;

function initializeAudio() {
  audioElement = document.getElementById('audio');

  audioElement.addEventListener('play', handlePlay);

  audioElement.addEventListener('pause', handlePause);
}

function handlePlay() {
  console.log('play');
  if (!audioContext) {
    audioContext = new AudioContext();
    audioSource = audioContext.createMediaElementSource(audioElement);
    audioPanner = audioContext.createPanner();
    audioFilter = audioContext.createBiquadFilter();

    // Connect audio nodes
    audioSource.connect(audioPanner);
    audioPanner.connect(audioFilter);
    audioFilter.connect(audioContext.destination);

    // Set filter parameters
    audioFilter.type = 'highpass';
    audioFilter.Q.value = 5;
    audioFilter.frequency.value = 555;
    audioFilter.gain.value = 15;

    audioContext.resume();
  }
}

function handlePause() {
  console.log('pause');
  audioContext.resume();
}

function toggleFilter() {
  let filterCheckbox = document.getElementById('filterCheckbox');
  if (filterCheckbox.checked) {
    // Connect filter when checkbox is checked
    audioPanner.disconnect();
    audioPanner.connect(audioFilter);
    audioFilter.connect(audioContext.destination);
  } else {
    // Disconnect filter when checkbox is unchecked
    audioPanner.disconnect();
    audioPanner.connect(audioContext.destination);
  }
}

function startAudio() {
  initializeAudio();

  let filterCheckbox = document.getElementById('filterCheckbox');
  filterCheckbox.addEventListener('change', toggleFilter);

  audioElement.play();
}
