import { ProvenanceGraph, ProvenanceGraphTraverser, ProvenanceTracker, ActionFunctionRegistry } from "@visualstorytelling/provenance-core";
import { ProvenanceSlidedeck } from "../src/provenance-slide-deck";
import { ProvenanceSlide } from "../src/provenance-slide";
import { ProvenanceSlidedeckVisualization } from '../src/provenance-slide-deck-visualization';
import * as d3 from 'd3';

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

const slide = new ProvenanceSlide('slide1', 1, 0);
const slide2 = new ProvenanceSlide('slide2', 1, 0);
const slide3 = new ProvenanceSlide('slide3', 1, 0);

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
    slideDeck.addSlide(slide);
    slideDeck.addSlide(slide2);
    slideDeck.addSlide(slide3);
  });

  it('should render without crashing', () => {
    const vis = new ProvenanceSlidedeckVisualization(slideDeck, visRoot);
  });

  it('should render all slides', () => {
    const vis = new ProvenanceSlidedeckVisualization(slideDeck, visRoot);
    expect(visRoot.children[0].children).toHaveLength(slideDeck.slides.length);
  });

  describe('event listeners', () => {
    let vis: ProvenanceSlidedeckVisualization;
    beforeEach(() => {
      vis = new ProvenanceSlidedeckVisualization(slideDeck, visRoot);
    });

    it('should have a working onDelete listener', () => {
      expect(vis).toHaveProperty('onDelete');
      const spiedfunc = jest.spyOn(slideDeck, 'removeSlide');
      const deleteButton = document.getElementById('delete_' + slide.id) as HTMLButtonElement;
      deleteButton.dispatchEvent(new Event('click'));
      expect(spiedfunc).toHaveBeenCalledWith(slide);
    });

    it('should have an onAdd listener', () => {
      expect(vis).toHaveProperty('onAdd');
    });
    it('should have an onSelect listener', () => {
      expect(vis).toHaveProperty('onSelect');
    });
  });
});
