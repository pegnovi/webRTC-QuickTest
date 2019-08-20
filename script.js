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

function midcallRemoveTrack (pc) {
  const sender = pc.getSenders()[0]
  pc.removeTrack(sender)
}

function midcallAddTrack (pc, elementId) {
  navigator.mediaDevices.getUserMedia({video: true, audio: false})
  .then(stream => {
    const element = document.getElementById(elementId)
    peerConnectionAddTrackAndSetHandlers(pc, stream, stream.getVideoTracks()[0], element, false)
  })
}

function peerConnectionAddTrackAndSetHandlers (pc, stream, track, element, isRemote) {
  let remoteText = ' remote'
  if (isRemote) {
    remoteText = ''
  }
  else {
    // Only do this for local tracks
    pc.addTrack(track, stream)
  }
  
  // console.log('pc local tracks', pc.getSenders())
  // console.log('pc remote tracks', pc.getReceivers())

  stream.onaddtrack = (e) => {
    // console.log(pc.name + remoteText + ' stream onaddtrack', e)
    log(pc.name + remoteText + ' stream onaddtrack')
  }
  stream.onremovetrack = (e) => {
    // console.log(pc.name + remoteText + ' stream onremovetrack', e)
    log(pc.name + remoteText + ' stream onremovetrack')
  }
  track.onended = (e) => {
    // console.log(pc.name + remoteText + ' track ended', e)
    log(pc.name + remoteText + ' track ended')
  }
  element.srcObject = stream
}

function doOffer (pc, otherPc) {
  const uiDirection = document.getElementById(pc.name).value
  return new Promise(resolve => resolve())
    .then(() => {
      return pc.createOffer()
    })
    .then(description => {
      if (uiDirection) {
        description.sdp = description.sdp.replace(/sendrecv|sendonly|recvonly|inactive/g, uiDirection)
      }
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
  const uiDirection = document.getElementById(pc.name).value
  return new Promise(resolve => resolve())
    .then(() => {
      return pc.createAnswer()
    })
    .then(description => {
      if (uiDirection) {
        description.sdp = description.sdp.replace(/sendrecv|sendonly|recvonly|inactive/g, uiDirection)
      }
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

function localPeerConnectionLoop (cfg = {sdpSemantics: 'plan-b'}) {
  return [0, 1].map(() => new RTCPeerConnection(cfg)).map((pc, i, pcs) => Object.assign(pc, {
    name: 'pc' + (i + 1),
    onicecandidate: e => pcs[i ^ 1].addIceCandidate(e.candidate),
    onnegotiationneeded: async e => {
      console.log('^^^ pc' + (i + 1) + ' on negotiation needed')
    }
  }));
}

const mediaTrackers = [false, false];

(async () => {
  try {
    [pc1, pc2] = localPeerConnectionLoop();
    console.log('^^^ local peers created')

    // camStream1 = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
    // camStream2 = await navigator.mediaDevices.getUserMedia({video: true, audio: false});

    camStream1 = await navigator.mediaDevices.getUserMedia({video: false, audio: true});
    camStream2 = await navigator.mediaDevices.getUserMedia({video: false, audio: true});

    console.log('^^^ created camera streams')

    // peerConnectionAddTrackAndSetHandlers(pc1, camStream1, camStream1.getVideoTracks()[0], videoA, false)
    // peerConnectionAddTrackAndSetHandlers(pc2, camStream2, camStream2.getVideoTracks()[0], videoC, false)

    peerConnectionAddTrackAndSetHandlers(pc1, camStream1, camStream1.getAudioTracks()[0], audioA, false)
    peerConnectionAddTrackAndSetHandlers(pc2, camStream2, camStream2.getAudioTracks()[0], audioC, false)

    console.log('^^^ added tracks')

    // for (let [pc, videoR, mediaNum] of [[pc1, videoB, 0], [pc2 , videoD, 1]]) {
    for (let [pc, audioR, mediaNum] of [[pc1, audioB, 0], [pc2 , audioD, 1]]) {
      pc.ontrack = ({transceiver, streams, track}) => {

        console.log('^^^ ' + pc.name + ' remote ontrack', transceiver, streams, track)

        // peerConnectionAddTrackAndSetHandlers(pc, streams[0], track, videoR, true)
        peerConnectionAddTrackAndSetHandlers(pc, streams[0], track, audioR, true)

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

// Utility function for appending messages to the message div.
function log(message) {
  // Wrap message in textNode to guarantee that it is a string
  // https://stackoverflow.com/questions/476821/is-a-dom-text-node-guaranteed-to-not-be-interpreted-as-html
  const textNode = document.createTextNode(message)
  const divContainer = document.createElement('div')
  divContainer.appendChild(textNode)
  document.getElementById('log').appendChild(divContainer)
}