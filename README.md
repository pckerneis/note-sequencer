![alt text](https://img.shields.io/github/package-json/v/pckerneis/note-sequencer "package version") ![alt text](https://img.shields.io/github/languages/code-size/pckerneis/note-sequencer "codebase size")

# note-sequencer

> A canvas based note sequencer.

**note-sequencer** is a lightweight interactive and customizable note sequencer. It is based on Custom Elements and Canvas APIs.

![alt text](https://github.com/pckerneis/note-sequencer/raw/master/docs/img/main.png "note-sequencer screenshot")

**Key features**
- Grid snap
- Multi-selection with keyboard and lasso
- All colors are customizable
- Cross-browser and dependency free
- Lightweight: the minified source is ~33kB

## Installation

Clone the repository and install dependencies using
```
yarn install
```

## Usage

From a HTML page, insert `note-sequencer.js` into your webpage and add a `note-sequencer` element to it.
```
<note-sequencer></note-sequencer>
```

You can also create a `NoteSequencer` object and add it to the document with Javascript.
```javascript
import { NoteSequencer } from './note-sequencer.js';

const noteSequencer = new NoteSequencer();
document.querySelector('#my-container').append(noteSequencer);
```

## Contributing

Feel free to submit contributions.

## Authors

- **Pierre-Clément KERNEIS** - *Initial work*

See also the list of [contributors](https://github.com/pckerneis/note-sequencer/contributors) who participated in this project.

## License

This project is licensed under the GNU GPLv3 License - see the [LICENSE.md](LICENSE.md) file for details
