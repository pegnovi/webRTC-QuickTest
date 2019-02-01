let camStream;
let pc1
let pc2

function setTransceiverDirection (pc, targetDirection) {
  pc.getTransceivers()[0].direction = targetDirection
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
      console.log('^^^ stream onaddtrack', e)
    }
    stream.onremovetrack = (e) => {
      console.log('^^^ stream onremovetrack', e)
    }
    video = document.getElementById(videoElementId)
    video.srcObject = stream
  })
}

function localPeerConnectionLoop (cfg = {sdpSemantics: 'unified-plan'}) {
  const setD = (d, a, b) => Promise.all([a.setLocalDescription(d), b.setRemoteDescription(d)]);
  return [0, 1].map(() => new RTCPeerConnection(cfg)).map((pc, i, pcs) => Object.assign(pc, {
    onicecandidate: e => pcs[i ^ 1].addIceCandidate(e.candidate),
    onnegotiationneeded: async e => {
      console.log('^^^ on negotiation needed')
      try {
        await setD(await pc.createOffer(), pc, pcs[i ^ 1]);
        await setD(await pcs[i ^ 1].createAnswer(), pcs[i ^ 1], pc);
      } catch (e) {
        console.log(e);
      }
    }
  }));
}

(async () => {
  try {
    [pc1, pc2] = localPeerConnectionLoop();
    console.log('^^^ local peers created')

    camStream1 = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
    camStream2 = await navigator.mediaDevices.getUserMedia({video: true, audio: false});

    for (let camStream of [camStream1, camStream2]) {
      camStream.onaddtrack = (e) => {
        console.log('^^^ stream onaddtrack', e)
      }
      camStream.onremovetrack = (e) => {
        console.log('^^^ stream onremovetrack', e)
      }
    }

    console.log('^^^ created camera streams')

    pc1.addTrack(camStream1.getVideoTracks()[0], camStream1)
    pc2.addTrack(camStream2.getVideoTracks()[0], camStream2)

    console.log('^^^ added tracks')

    for (let [pc, camStream, videoL] of [[pc1, camStream1, videoA], [pc2, camStream2, videoC]]) {
      videoL.srcObject = camStream
    }

    for (let [pc, videoR] of [[pc1, videoB], [pc2 , videoD]]) {
      pc.ontrack = ({transceiver, streams, track}) => {
        console.log('^^^ ontrack', transceiver, streams, track)
        streams[0].addTrack(track)
        videoR.srcObject = streams[0];
      }
    }

  } catch (e) {
    console.log(e)
  }
})();