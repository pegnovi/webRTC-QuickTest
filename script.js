let camStream;
let pc1
let pc2

function setTransceiverDirection (pc, targetDirection) {
  if (pc.getTransceivers()[0].setDirection) {
    pc.getTransceivers()[0].setDirection(targetDirection)
  }
  else {
    pc.getTransceivers()[0].direction = targetDirection
  }
  console.log(pc.getTransceivers()[0].setDirection)
  console.log('Setting ' + pc.name + ' direction to: ' + pc.getTransceivers()[0].direction)
}

function removeTrack (pc) {
  const sender = pc.getSenders()[0]
  pc.removeTrack(sender)
}

function addTrack (pc, videoElementId) {
  navigator.mediaDevices.getUserMedia({video: true, audio: false})
  .then(stream => {
    pc.addTrack(stream.getVideoTracks()[0], stream)
    stream.onaddtrack = (e) => {
      console.log('^^^ ' + pc.name + ' stream onaddtrack', e)
    }
    stream.onremovetrack = (e) => {
      console.log('^^^ ' + pc.name + ' stream onremovetrack', e)
    }
    video = document.getElementById(videoElementId)
    video.srcObject = stream
  })
}

function doOffer (pc, otherPc) {
  return new Promise(resolve => resolve())
    .then(() => {
      return pc.createOffer()
    })
    .then(description => {
      console.log(pc.name + ' Offer:', description)
      return pc.setLocalDescription(description)
      .then(() => {
        return description
      })
    })
    .then((description) => {
      return otherPc.setRemoteDescription(description)
    })
    .catch(e => {
      throw e
    })
}

function doAnswer (pc, otherPc) {
  return new Promise(resolve => resolve())
    .then(() => {
      return pc.createAnswer()
    })
    .then(description => {
      console.log(pc.name + ' Answer:', description)
      return pc.setLocalDescription(description)
      .then(() => {
        return description
      })
    })
    .then((description) => {
      return otherPc.setRemoteDescription(description)
    })
    .catch(e => {
      throw e
    })
}

function localPeerConnectionLoop (cfg = {sdpSemantics: 'unified-plan'}) {
  return [0, 1].map(() => new RTCPeerConnection(cfg)).map((pc, i, pcs) => Object.assign(pc, {
    name: 'pc' + i,
    onicecandidate: e => pcs[i ^ 1].addIceCandidate(e.candidate),
    onnegotiationneeded: async e => {
      console.log('^^^ pc' + i + ' on negotiation needed')
    }
  }));
}

const mediaTrackers = [false, false];

(async () => {
  try {
    [pc1, pc2] = localPeerConnectionLoop();
    console.log('^^^ local peers created')

    camStream1 = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
    camStream2 = await navigator.mediaDevices.getUserMedia({video: true, audio: false});

    var i = 0
    for (let camStream of [camStream1, camStream2]) {
      camStream.onaddtrack = (e) => {
        console.log('^^^ stream-' + i + ' local stream onaddtrack', e)
      }
      camStream.onremovetrack = (e) => {
        console.log('^^^ stream-' + i + ' local stream onremovetrack', e)
      }
      i++
    }

    console.log('^^^ created camera streams')

    pc1.addTrack(camStream1.getVideoTracks()[0], camStream1)
    pc2.addTrack(camStream2.getVideoTracks()[0], camStream2)

    console.log('^^^ added tracks')

    for (let [pc, camStream, videoL] of [[pc1, camStream1, videoA], [pc2, camStream2, videoC]]) {
      videoL.srcObject = camStream
    }

    for (let [pc, videoR, mediaNum] of [[pc1, videoB, 0], [pc2 , videoD, 1]]) {
      pc.ontrack = ({transceiver, streams, track}) => {
        console.log('^^^ ' + pc.name + ' remote ontrack', transceiver, streams, track)
        streams[0].addTrack(track)
        videoR.srcObject = streams[0];

        console.log('^^^ ONTRACK STREAM', streams[0])
        if (!mediaTrackers[mediaNum]) {
          mediaTrackers[mediaNum] = true
          streams[0].onremovetrack = (e) => {
            console.log('^^^ ' + pc.name + ' remote onremovetrack', e)
          }
        }

        if (mediaNum === 1) {
          console.log('^^^ CAMSTREAM1 === STREAMS[0]', camStream1 === streams[0])
        }
        else {
          console.log('^^^ CAMSTREAM2 === STREAMS[0]', camStream2 === streams[0])
        }
        // streams[0].onremovetrack = (e) => {
        //   console.log('^^^ remote stream onremovetrack', e)
        // }
      }
    }

  } catch (e) {
    console.log(e)
  }
})();