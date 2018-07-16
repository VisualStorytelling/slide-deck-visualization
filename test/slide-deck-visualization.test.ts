import { ProvenanceGraph, ProvenanceGraphTraverser, ProvenanceTracker, ActionFunctionRegistry, ProvenanceSlidedeck, ProvenanceSlide } from "@visualstorytelling/provenance-core";
import { SlideDeckVisualization } from '../src/slide-deck-visualization';

let graph: ProvenanceGraph;
let tracker: ProvenanceTracker;
let registry: ActionFunctionRegistry;
let slideDeck: ProvenanceSlidedeck;
let traverser: ProvenanceGraphTraverser;

const username: string = 'me';

class Calculator {
  offset = 42;

  add(y: number): Promise<void> {
    this.offset = this.offset + y;
    return Promise.resolve();
  }

  subtract(y: number): Promise<void> {
    this.offset = this.offset - y;
    return Promise.resolve();
  }
}

let calculator: Calculator;

const slide1 = new ProvenanceSlide('slide1', 1, 0);
const slide2 = new ProvenanceSlide('slide2', 1, 0);
const slide3 = new ProvenanceSlide('slide3', 1, 0);

const slides = [slide1, slide2, slide3];

const body = document.body;
body.innerHTML = `
  <div id="vis"></div>
`;

const visRoot = document.getElementById('vis') as HTMLDivElement;

describe('ProvenanceTreeSlidedeck', () => {
  beforeEach(() => {
    visRoot.innerHTML = '';

    calculator = new Calculator();
    graph = new ProvenanceGraph(
      { name: 'calculator', version: '1.0.0' },
      username
    );
    registry = new ActionFunctionRegistry();
    registry.register('add', calculator.add, calculator);
    registry.register('subtract', calculator.subtract, calculator);
    tracker = new ProvenanceTracker(registry, graph, username);
    traverser = new ProvenanceGraphTraverser(registry, graph);

    slideDeck = new ProvenanceSlidedeck({ name: 'calculator', version: '1.0.0' }, traverser);
    slideDeck.addSlide(slide1);
    slideDeck.addSlide(slide2);
    slideDeck.addSlide(slide3);
  });

  it('should render without crashing', () => {
    const vis = new SlideDeckVisualization(slideDeck, visRoot);
  });

  // it('should render all slides', () => {
  //   const vis = new ProvenanceSlidedeckVisualization(slideDeck, visRoot);    
  //   expect(svgGroups).toHaveLength(slideDeck.slides.length + 1);
  // });

  describe.skip('event listeners', () => {
    let vis: SlideDeckVisualization;
    beforeEach(() => {
      vis = new SlideDeckVisualization(slideDeck, visRoot);
    });

    it('should have a working onDelete listener', () => {
      expect(vis).toHaveProperty('onDelete');
      const spiedfunc = jest.spyOn(slideDeck, 'removeSlide');
      const deleteButton = document.querySelector(`tr[id="${slide1.id}"]>.slide__delete>button`) as HTMLButtonElement;
      deleteButton.dispatchEvent(new Event('click'));
      expect(spiedfunc).toHaveBeenCalledWith(slide1);
    });

    test.each([1, 2, 3])('selects slide (slide %i)', (i) => {
      expect(vis).toHaveProperty('onSelect');
      const slide = slides[i-1];
      const slideElm = document.querySelector(`.slides__table>tr[id="${slide.id}"]`) as HTMLTableRowElement;
      slideElm.dispatchEvent(new Event('click'));
      expect(slideDeck.selectedSlide).toBe(slide);
      expect(slideElm.classList.contains('selected')).toBeTruthy();
      // expect(slideDeck.graph.current).toBe(slide.node);
    });

    it('should have an onAdd listener', () => {
      expect(vis).toHaveProperty('onAdd');

    });
  });
});
