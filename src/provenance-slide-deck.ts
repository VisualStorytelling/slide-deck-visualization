export const bla = 'bla';

import { ProvenanceGraphTraverser } from '@visualstorytelling/provenance-core';
import { ProvenanceSlide } from './provenance-slide';

export type Annotation = any;

export class ProvenanceSlidedeck {
    private _slides: ProvenanceSlide[] = [];
    private traverser: ProvenanceGraphTraverser;

    public get slides() { return this._slides; }

    private _selectedSlide: ProvenanceSlide | null;

    constructor(traverser: ProvenanceGraphTraverser) {
        this.traverser = traverser;

        this._selectedSlide = null;
        // this.graph = traverser.graph;
    }

    public addSlide(slide: ProvenanceSlide, index?: number) {
        if (!index || isNaN(index) || !Number.isInteger(index) || index > this._slides.length || index < 0) {
            index = this._slides.length;
        }
        if (this._slides.length === 0) {
            this._selectedSlide = slide;
        }
        this._slides.splice(index, 0, slide);
    }

    public removeSlideAtIndex(index: number) {
        let deletedSlides = this._slides.splice(index, 1);

        // This can only be 1 slide now, therefore this is ok.
        if (this._selectedSlide === deletedSlides[0]) {
            this.selectedSlide = null;
        }
    }

    public removeSlide(slide: ProvenanceSlide) {
        this.removeSlideAtIndex(this._slides.indexOf(slide));
    }

    public get selectedSlide(): ProvenanceSlide | null {
        return this._selectedSlide;
    }
    public moveSlide(indexFrom: number, indexTo: number, count: number = 1) {
        const movedSlides = this._slides.splice(indexFrom, count);
        const newPosition = indexTo > indexFrom ? indexTo - count : indexTo;
        this._slides.splice(newPosition, 0, ...movedSlides);
    }

    public set selectedSlide(value: ProvenanceSlide | null) {
        if (value && value.node) {
            this.traverser.toStateNode(value.node.id);
        }
        this._selectedSlide = value;
    }
}
