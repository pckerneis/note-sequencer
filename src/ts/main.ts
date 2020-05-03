import {NoteSequencer} from './note-sequencer';

if (customElements.get(NoteSequencer.tag) == null) {
  customElements.define(NoteSequencer.tag, NoteSequencer);
}