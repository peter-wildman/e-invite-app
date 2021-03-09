import * as THREE from './three.module.js';
import {OrbitControls} from './OrbitControls.js';
import {GLTFLoader} from './GLTFLoader.js';

function main() {
  //for wobble
  var updateFcts	= [];
  var breakApart = false;
  var yWobbleSpeed = 0.1;
  var yWobbleDist = 0.8;
  var xWobbleDist = 0.31;
  let extremeWobbleTrigger = false;
  let beltTransfromTime = 10000;
  let spinTrigger = false;
  let spinTriggerTime = 4000;
  let counter = 0;
  var mesh;
  let beltSpinCounter = 0;
  let beltSpeed = 0.00001;


  const canvas = document.querySelector('#c');
  //set canvas to bellow the window
  canvas.style.top = window.innerHeight;
  canvas.style.backgroundColor = 'hsl(350,100%,88%)';

  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias: true});
  const fov = 32;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 10, 20);
  //console.log(camera.position);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0);
  controls.update();

  const scene = new THREE.Scene();
  renderer.setClearColor( 0x000000,0 ); // the default

  //belt material declared here to make global
  const material	= new THREE.MeshNormalMaterial();

  let fadeInFlag = false;



  function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
    const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
    const halfFovY = THREE.MathUtils.degToRad(camera.fov * .5);
    const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);
    // compute a unit vector that points in the direction the camera is now
    // in the xz plane from the center of the box
    const direction = (new THREE.Vector3())
        .subVectors(camera.position, boxCenter)
        .multiply(new THREE.Vector3(1, 0, 1))
        .normalize();

    // move the camera to a position distance units way from the center
    // in whatever direction the camera was from the center already
    camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));
    camera.position.y += 160;
    camera.position.x -= 90;


    // pick some near and far values for the frustum that
    // will contain the box.
    camera.near = boxSize / 100;
    camera.far = boxSize * 100;
    camera.updateProjectionMatrix();
    // point the camera to look at the center of the box
    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
  }



  {
      const gltfLoader = new GLTFLoader();
      let geometry;
      gltfLoader.load('./models/belt/sceneMesh02.glb', (gltf) => {
      const root = gltf.scene;

      root.traverse ( ( o ) => {
          if ( o.isMesh ) {
            // note: for a multi-material mesh, `o.material` may be an array,
            // in which case you'd need to set `.map` on each value.
            var bufferGeometry = o.geometry;
            geometry = new THREE.Geometry().fromBufferGeometry( bufferGeometry );
          }
        } );


         material.opacity = 0.0;
         material.transparent = true;
      	 mesh	= new THREE.Mesh( geometry, material );

         scene.add( mesh );

        //////////////////////////////////////////////////////////////////////////////////
        //		Do a vertex animation on this mesh				//
        //////////////////////////////////////////////////////////////////////////////////
        // instanciate the animation object
        var animation	= new THREEx.VertexAnimation(geometry, function(origin, position, delta, now){
          // here you put your formula, something clever which fit your needs
      		var speed	= 2 + Math.cos(0.2 * now*Math.PI*2)*2;
      		//var angle	= speed*now*Math.PI*2 + origin.y*10;
      		var angle	= 5*now*Math.PI*2 + origin.y*15;
          counter++;

          if(!breakApart){
            position.x	= origin.x + Math.cos(angle*0.1)*xWobbleDist;
        		position.y	= origin.y + Math.sin(angle*yWobbleSpeed)* yWobbleDist;
        		position.z	= origin.z + Math.sin(angle*0.1)*0.53;
          } else {
            if(counter % 5 == 0){
              position.x = -200;
          		position.y= -200;
            } else if(counter % 7) {
              position.x= 200;
          		position.y= 200;
            } else if(counter % 9) {
              position.x= -200;
          		position.y= 200;
            } else if(counter % 13) {
              position.x= 200;
          		position.y= -200;
            }
          }
        })
        // update the animation at every frame
        updateFcts.push(function(delta, now){
          animation.update(delta, now)
        })


      // compute the box that contains all the stuff
      // from root and below
      const box = new THREE.Box3().setFromObject(root);

      const boxSize = box.getSize(new THREE.Vector3()).length();
      const boxCenter = box.getCenter(new THREE.Vector3());

      // set the camera to frame the box
      frameArea(boxSize, boxSize, boxCenter, camera);

      // update the Trackball controls to handle the new size
      controls.maxDistance = boxSize;
      controls.target.copy(boxCenter);
      controls.update();
    });
  }



  function resizeRendererToDisplaySize(renderer) {

    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }


  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      const aspectProportion = canvas.clientWidth / canvas.clientHeight;
      if(aspectProportion > 1.08){
        camera.aspect = aspectProportion;
      } else {
        camera.aspect = 1.3;
      }

      camera.updateProjectionMatrix();
    }
    //animate canvas to top of screen
    var canvasTopInt = parseInt(canvas.style.top);
    //console.log(canvasTopInt);
    if( canvasTopInt > 0) {
      canvasTopInt -= canvasTopInt * 0.04;
      canvas.style.top = Math.floor(canvasTopInt);
      material.opacity = 0;
    } else {
      //wait half a second before bringing belt in
      setTimeout(() => {
        fadeInFlag = true;
      }, 500);
    }
    //fade belt in
    if(fadeInFlag){
      //bellow 0.7 opacity the belt is just white
      if(material.opacity < 1.0) {
        material.opacity += 0.03;
      } else {
        if(!breakApart){

        //increase wobble till breakApart
        if(extremeWobbleTrigger == false){
          setTimeout(() => {
              spinTrigger = true;
            }, spinTriggerTime);
          //extremeWobbleTrigger = true;
          //console.log(extremeWobbleTrigger);
        setTimeout(() => {
            extremeWobbleTrigger = true;
          }, beltTransfromTime);
        }

        if(extremeWobbleTrigger){
          yWobbleSpeed += 0.01;
          yWobbleDist += 0.8;
          xWobbleDist += 0.4;
        }

        if(spinTrigger){
          beltSpinCounter += beltSpeed;
          //beltSpinCounter = beltSpinCounter + Math.sin(beltSpinCounter)*10;
          console.log(Math.sin(beltSpinCounter));
           // camera.position.x = (Math.sin(beltSpinCounter)*10);
           // camera.position.z = (Math.cos(beltSpinCounter)*10)+400;
           //mesh.rotation.y = (Math.sin(beltSpinCounter)*10);
           mesh.rotation.y = beltSpinCounter;
           // mesh.rotation.z = beltSpinCounter-0.08;
           beltSpeed+=0.002;
        }
      } //!breakApart

        //wait 2 secs then animate vertexes
        //to break apart into colour
        setTimeout(() => {
          breakApart = true;
        },beltTransfromTime+1000);
      }
    }
    //adding this range to the hue
    //keeps the colour change more restrained
    let hRange = 40;
    //algorithm that evens out the camera values
    //maps it to 360 deg and starts at pink
    let h = (camera.position.x+385)/770;
    h = h*hRange + 333;


    //constrains to 0-360
    if(h > 360) h = h-360;
    //change canvas bg color
    canvas.style.backgroundColor = 'hsl(' + h + ',100%,88%)';

    renderer.render(scene, camera);
    requestAnimationFrame(render);
    // console.log("camera x: " + camera.position.x);
    // console.log("camera y: " + camera.position.y);
    // console.log("camera z: " + camera.position.z);
  }

    requestAnimationFrame(render);


  //////////////////////////////////////////////////////////////////////////////////
	//		render the scene						//
	//////////////////////////////////////////////////////////////////////////////////
	updateFcts.push(function(){
		renderer.render( scene, camera );
    counter = 0;
	})

  //////////////////////////////////////////////////////////////////////////////////
	//		loop runner							//
	//////////////////////////////////////////////////////////////////////////////////
	var lastTimeMsec= null

	requestAnimationFrame(function animate(nowMsec){
		// keep looping
    //until the belt breaks breakApart
    if(breakApart == false){
		requestAnimationFrame( animate );
    }
		// measure time
		lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
		var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
		lastTimeMsec	= nowMsec
		// call each update function
		updateFcts.forEach(function(updateFn){
			updateFn(deltaMsec/1000, nowMsec/1000)
		})
	})
}//main

main();
