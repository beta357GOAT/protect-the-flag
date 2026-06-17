// Web Audio API Synthesizer for Protect to Win: Neon Flag Assault
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.activeLightningNode = null;
        this.activeLightningOsc = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playLaser() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playBurst() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        // Make a tight, rapid sequence of three blips
        const now = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const delay = i * 0.06;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200 - (i * 100), now + delay);
            osc.frequency.exponentialRampToValueAtTime(300, now + delay + 0.05);

            gain.gain.setValueAtTime(0.08, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.005, now + delay + 0.05);

            osc.start(now + delay);
            osc.stop(now + delay + 0.05);
        }
    }

    playShotgun() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        // Shotgun is a noisy explosion + a lower frequency punch
        const now = this.ctx.currentTime;
        const duration = 0.25;

        // Create white noise buffer
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Bandpass filter to make it sound punchy and metallic
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 2.0;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.exponentialRampToValueAtTime(0.005, now + duration);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // Low frequency thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

        oscGain.gain.setValueAtTime(0.15, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noiseNode.start(now);
        noiseNode.stop(now + duration);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playPlasmaLaunch() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.25);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playPlasmaExplode() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        // Big explosion thud
        const duration = 0.45;
        const now = this.ctx.currentTime;
        
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + duration);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.005, now + duration);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // Sub thud
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.type = 'sine';
        sub.frequency.setValueAtTime(100, now);
        sub.frequency.linearRampToValueAtTime(20, now + 0.3);
        
        subGain.gain.setValueAtTime(0.2, now);
        subGain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

        noiseNode.start(now);
        noiseNode.stop(now + duration);
        sub.start(now);
        sub.stop(now + 0.3);
    }

    startLightningLaser() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx || this.activeLightningNode) return;

        const now = this.ctx.currentTime;
        
        this.activeLightningNode = this.ctx.createGain();
        this.activeLightningNode.gain.setValueAtTime(0.03, now);
        this.activeLightningNode.connect(this.ctx.destination);

        // Oscillator for buzz
        this.activeLightningOsc = this.ctx.createOscillator();
        this.activeLightningOsc.type = 'sawtooth';
        this.activeLightningOsc.frequency.setValueAtTime(180, now); // Low electric hum

        // Modulator oscillator for lightning crackle
        const mod = this.ctx.createOscillator();
        mod.frequency.setValueAtTime(55, now);
        const modGain = this.ctx.createGain();
        modGain.gain.setValueAtTime(40, now);

        mod.connect(modGain);
        modGain.connect(this.activeLightningOsc.frequency);

        this.activeLightningOsc.connect(this.activeLightningNode);

        mod.start(now);
        this.activeLightningOsc.start(now);
        
        // Save references to stop them later
        this.activeLightningMod = mod;
    }

    stopLightningLaser() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        if (this.activeLightningNode) {
            try {
                this.activeLightningNode.gain.cancelScheduledValues(now);
                this.activeLightningNode.gain.setValueAtTime(this.activeLightningNode.gain.value, now);
                this.activeLightningNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
            } catch(e) {}
            
            const osc = this.activeLightningOsc;
            const mod = this.activeLightningMod;
            
            setTimeout(() => {
                try {
                    osc.stop();
                    mod.stop();
                } catch(e) {}
            }, 100);
            
            this.activeLightningNode = null;
            this.activeLightningOsc = null;
            this.activeLightningMod = null;
        }
    }

    playMissileLaunch() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(650, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.2);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playCoin() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Classic coin double ding: primary note then higher note
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now); // B5
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc1.start(now);
        osc1.stop(now + 0.08);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain2.gain.setValueAtTime(0.12, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);
    }

    playFlagStolen() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Two-tone warning siren
        const duration = 0.6;
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(520, now);
        osc1.frequency.setValueAtTime(660, now + 0.15);
        osc1.frequency.setValueAtTime(520, now + 0.3);
        osc1.frequency.setValueAtTime(660, now + 0.45);

        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.linearRampToValueAtTime(0.15, now + 0.5);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.start(now);
        osc1.stop(now + duration);
    }

    playFlagReturned() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Sweeping upward crystal chime
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    playFlagScored() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Triumphant chord: Major Triad C4-E4-G4-C5
        const freqs = [261.63, 329.63, 392.00, 523.25];
        
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.06, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.7);

            osc.start(now + idx * 0.05);
            osc.stop(now + 0.75);
        });
    }

    playDeath() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Downward sweep noise + low buzz
        const duration = 0.35;
        
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(30, now + duration);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.005, now + duration);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(30, now + duration);
        oscGain.gain.setValueAtTime(0.1, now);
        oscGain.gain.exponentialRampToValueAtTime(0.005, now + duration);

        noiseNode.start(now);
        noiseNode.stop(now + duration);
        osc.start(now);
        osc.stop(now + duration);
    }
}

const sfx = new SoundEngine();
window.sfx = sfx;
