import { config } from './config.js';
import { nostrClient } from './nostr.js';

export class VoiceChat {
  constructor() {
    this.localStream = null;
    this.peers = new Map();
  }

  async init() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  async connectToPeer(pubkey, remoteX, remoteY, localX, localY) {
    const distance = Math.sqrt((remoteX - localX) ** 2 + (remoteY - localY) ** 2);
    if (distance > config.VOICE_CHAT_RANGE || this.peers.has(pubkey)) return;

    const pc = new RTCPeerConnection({ iceServers: config.ICE_SERVERS });
    this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.volume = Math.max(0, 1 - (distance / config.VOICE_CHAT_RANGE));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateEvent = {
          kind: 420401,
          pubkey: nostrClient.pubkey,
          content: JSON.stringify({ candidate: event.candidate, target: pubkey }),
          tags: [['t', 'voice']],
          created_at: Math.floor(Date.now() / 1000),
        };
        nostrClient.publish(config.WEBRTC_RELAY_URL, candidateEvent);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const offerEvent = {
      kind: 420401,
      pubkey: nostrClient.pubkey,
      content: JSON.stringify({ offer, target: pubkey }),
      tags: [['t', 'voice']],
      created_at: Math.floor(Date.now() / 1000),
    };
    await nostrClient.publish(config.WEBRTC_RELAY_URL, offerEvent);

    this.peers.set(pubkey, pc);
  }

  async handleSignaling(event) {
    const data = JSON.parse(event.content);
    if (data.target !== nostrClient.pubkey) return;

    if (data.offer) {
      const pc = new RTCPeerConnection({ iceServers: config.ICE_SERVERS });
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const answerEvent = {
        kind: 420401,
        pubkey: nostrClient.pubkey,
        content: JSON.stringify({ answer, target: event.pubkey }),
        tags: [['t', 'voice']],
        created_at: Math.floor(Date.now() / 1000),
      };
      await nostrClient.publish(config.WEBRTC_RELAY_URL, answerEvent);

      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateEvent = {
            kind: 420401,
            pubkey: nostrClient.pubkey,
            content: JSON.stringify({ candidate: event.candidate, target: event.pubkey }),
            tags: [['t', 'voice']],
            created_at: Math.floor(Date.now() / 1000),
          };
          nostrClient.publish(config.WEBRTC_RELAY_URL, candidateEvent);
        }
      };

      this.peers.set(event.pubkey, pc);
    } else if (data.answer) {
      const pc = this.peers.get(event.pubkey);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
      const pc = this.peers.get(event.pubkey);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  updatePeers(players, localX, localY) {
    for (const [pubkey, player] of players) {
      if (pubkey !== nostrClient.pubkey && player.active) {
        this.connectToPeer(pubkey, player.x, player.y, localX, localY);
      }
    }
  }

  cleanup() {
    for (const [, pc] of this.peers) {
      pc.close();
    }
    this.peers.clear();
  }
}

export const voiceChat = new VoiceChat();
