import { ProvenanceGraph, ProvenanceGraphTraverser, ProvenanceTracker, ActionFunctionRegistry } from "@visualstorytelling/provenance-core";
import { ProvenanceSlidedeck } from "../src/provenance-slide-deck";
import { ProvenanceSlide } from "../src/provenance-slide";

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

const testNode1 = {
    id: 'sdkljbgfoasdbfdsbvckjurebvlauwyb',
    label: 'Some node',
    metadata: {
      createdBy: 'me',
      createdOn: 123456
    },
    parent: null,
    children: [],
    artifacts: {}
  };

const slide = new ProvenanceSlide('slide1', 1, 0);
const slide2 = new ProvenanceSlide('slide2', 1, 0);
const slide3 = new ProvenanceSlide('slide3', 1, 0);
const slideWithNode = new ProvenanceSlide('slideWithNode', 1, 0, [], testNode1);

describe('ProvenanceTreeSlidedeck', () => {
    beforeEach(() => {
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
        slideDeck = new ProvenanceSlidedeck(traverser);
    });

    it('makes a Slidedeck', () => {
        expect(slideDeck).toBeInstanceOf(ProvenanceSlidedeck);
        expect(slideDeck.slides).toHaveLength(0);
    });

    describe('add slides', () => {
        describe('add slides', () => {
            it('should add a slide to an empty deck', () => {
                slideDeck.addSlide(slide);
                expect(slideDeck.slides).toEqual([slide]);
            });
        });

        describe('add slides to decks with slides', () => {
            beforeEach(() => {
                slideDeck.addSlide(slide);
                slideDeck.addSlide(slide3);
            });

            it('should add a slide at the end by default', () => {
                slideDeck.addSlide(slide2);
                expect(slideDeck.slides).toEqual([slide, slide3, slide2]);
            });

            it('should add a slide at index', () => {
                slideDeck.addSlide(slide2, 1);
                expect(slideDeck.slides).toEqual([slide, slide2, slide3]);
            });

            it('should add a slide at the end if the index is nonsense', () => {
                slideDeck.addSlide(slide2, NaN);
                expect(slideDeck.slides).toEqual([slide, slide3, slide2]);
            });
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

    describe('selected slide', () => {
        it('initially has a null selection', () => {
            expect(slideDeck.selectedSlide).toEqual(null);
        });

        it('has a selected slide when a slide is added', () => {
            slideDeck.addSlide(slide);
            expect(slideDeck.selectedSlide).toBeInstanceOf(ProvenanceSlide);
        });


        describe('selecting slides', () => {
            beforeEach(() => {
                slideDeck.addSlide(slide);
                slideDeck.addSlide(slideWithNode);
                slideDeck.addSlide(slide3);
            });

            it('can select another slide', () => {
                slideDeck.selectedSlide = slide3;
                expect(slideDeck.selectedSlide).toBe(slide3);
            });

            it('has signaled the traverser to change the slide when another is selected', () => {  
                slideDeck.selectedSlide = slide;     
                const spiedfunc = jest.spyOn(traverser, "toStateNode");
                slideDeck.selectedSlide = slideWithNode;
                expect(spiedfunc).toHaveBeenCalledWith(slideWithNode.node.id);
            });

        });

        describe('deleting slides', () => {
            beforeEach(() => {
                slideDeck.addSlide(slide);
                slideDeck.addSlide(slide2);
                slideDeck.addSlide(slide3);
            });

            it('does not change the selected slide automatically after the first is added', () => {
                expect(slideDeck.selectedSlide).toBe(slide);
            });

            it('can delete a slide', () => {
                slideDeck.removeSlide(slide3);
                expect(slideDeck.slides).not.toContain(slide3);
            });

            it('resets the selection to null if a selected slide is deleted', () => {
                slideDeck.selectedSlide = slide3;
                slideDeck.removeSlide(slide3);
                expect(slideDeck.selectedSlide).toBe(null);
            });
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
