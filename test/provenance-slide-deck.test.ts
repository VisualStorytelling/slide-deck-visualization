import {
  ProvenanceGraph,
  ProvenanceGraphTraverser,
  ProvenanceTracker,
  ActionFunctionRegistry,
  ActionFunction
} from '@visualstorytelling/provenance-core';
import { ProvenanceSlidedeck, ProvenanceSlide } from '../src/provenance-slide-deck';


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

const slide: ProvenanceSlide = {
  name: 'slide 1',
  duration: 1,
  delay: 0
};
const slide2: ProvenanceSlide = {
  name: 'slide 2',
  duration: 1,
  delay: 0
};
const slide3: ProvenanceSlide = {
  name: 'slide 3',
  duration: 1,
  delay: 0
};

beforeEach(() => {
  calculator = new Calculator();
  graph = new ProvenanceGraph(
    {name: 'calculator', version: '1.0.0'},
    username
  );
  const a: ActionFunction = calculator.add;
  registry = new ActionFunctionRegistry();
  registry.register('add', calculator.add, calculator);
  registry.register('subtract', calculator.subtract, calculator);
  tracker = new ProvenanceTracker(registry, graph, username);
  traverser = new ProvenanceGraphTraverser(registry, graph);
  slideDeck = new ProvenanceSlidedeck(traverser);
});

describe('ProvenanceTreeSlidedeck', () => {
  it('makes a Slidedeck', () => {
    expect(slideDeck).toBeInstanceOf(ProvenanceSlidedeck);
  });

  describe('insert slides', () => {
    it('can insert at start', () => {
      slideDeck.addSlide(slide);
      expect(slideDeck.slides).toHaveLength(1);
      expect(slideDeck.slides[0]).toBe(slide);
    });
    it('inserts at end without index argument', () => {
      slideDeck.addSlide(slide);
      slideDeck.addSlide(slide2);
      expect(slideDeck.slides[1]).toBe(slide2);
    });
    it('inserts at index if index argument is given', () => {
      slideDeck.addSlide(slide);
      slideDeck.addSlide(slide3);
      slideDeck.addSlide(slide2, 1);
      expect(slideDeck.slides[0]).toBe(slide);
      expect(slideDeck.slides[1]).toBe(slide2);
      expect(slideDeck.slides[2]).toBe(slide3);
    });
  });

  describe('remove slides', () => {
    beforeEach(() => {
      slideDeck.addSlide(slide);
      slideDeck.addSlide(slide2);
      slideDeck.addSlide(slide3);
    });

    it('should remove at index', () => {
      slideDeck.removeSlideAtIndex(1);
      expect(slideDeck.slides).toEqual([slide, slide3]);
    });

    it('should remove at slide from argument', () => {
      slideDeck.removeSlide(slide2);
      expect(slideDeck.slides).toEqual([slide, slide3]);
    });
  });

  describe('change order of slides', () => {
    beforeEach(() => {
      slideDeck.addSlide(slide);
      slideDeck.addSlide(slide2);
      slideDeck.addSlide(slide3);
    });
    it('does nothing when moving to same position', () => {
      slideDeck.moveSlide(0, 0);
      expect(slideDeck.slides[0]).toBe(slide);
    });
    it('can move 1 slide to end', () => {
      slideDeck.moveSlide(0, 2);
      expect(slideDeck.slides[0]).toBe(slide2);
      expect(slideDeck.slides[1]).toBe(slide);
    });
    it('can move 1 slide to start', () => {
      slideDeck.moveSlide(2, 0);
      expect(slideDeck.slides[0]).toBe(slide3);
      expect(slideDeck.slides[1]).toBe(slide);
    });
    it('can move 2 slides to end', () => {
      slideDeck.moveSlide(0, 3, 2);
      expect(slideDeck.slides[0]).toBe(slide3);
      expect(slideDeck.slides[1]).toBe(slide);
      expect(slideDeck.slides[2]).toBe(slide2);
    });
    it('can move 2 slides to start', () => {
      slideDeck.moveSlide(1, 0, 2);
      expect(slideDeck.slides[0]).toBe(slide2);
      expect(slideDeck.slides[1]).toBe(slide3);
      expect(slideDeck.slides[2]).toBe(slide);
    });
  });

});