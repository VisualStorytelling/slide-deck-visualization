import { ProvenanceGraphTraverser, Application, Handler, ProvenanceGraph, IProvenanceGraph } from '@visualstorytelling/provenance-core';
import mitt from './mitt';
import { IProvenanceSlidedeck, IProvenanceSlide, Annotation } from './api';
import { ProvenanceSlide} from './provenance-slide';

class ProvenanceSlidedeck implements IProvenanceSlidedeck {
    private _application: Application;
    private _graph: IProvenanceGraph;
    private _mitt: any;
    private _slides: IProvenanceSlide[] = [];
    private _traverser: ProvenanceGraphTraverser;
    private _selectedSlide: IProvenanceSlide | null;

    constructor(application: Application, traverser: ProvenanceGraphTraverser) {
        this._mitt = mitt();
        this._application = application;
        this._graph = traverser.graph;
        this._traverser = traverser;

        this._selectedSlide = null;
    }

    public get application() {
        return this._application;
    }

    public addSlide(slide?: IProvenanceSlide, index?: number) {
        if (!index || isNaN(index) || !Number.isInteger(index) || index > this._slides.length || index < 0) {
            index = this._slides.length;
        }

        if (!slide) {
            const node = this._graph.current;
            slide = new ProvenanceSlide(node.label, 1, 0, [], node);
        }
        if (this._slides.length === 0) {
            this._selectedSlide = slide;
        }
        this._slides.splice(index, 0, slide);
        this._mitt.emit('slideAdded', slide);
    }

    public removeSlideAtIndex(index: number) {
        let deletedSlides = this._slides.splice(index, 1);

        // This can only be 1 slide now, therefore this is ok.
        if (this._selectedSlide === deletedSlides[0]) {
            this.selectedSlide = null;
        }
        this._mitt.emit('slideRemoved', deletedSlides[0]);
    }

    public removeSlide(slide: IProvenanceSlide) {
        this.removeSlideAtIndex(this._slides.indexOf(slide));
    }

    public get selectedSlide(): IProvenanceSlide | null {
        return this._selectedSlide;
    }

    public moveSlide(indexFrom: number, indexTo: number, count: number = 1) {
        const movedSlides = this._slides.splice(indexFrom, count);
        const newPosition = indexTo > indexFrom ? indexTo - count : indexTo;
        this._slides.splice(newPosition, 0, ...movedSlides);

        this._mitt.emit('slidesMoved', this._slides);
    }

    public set selectedSlide(slide: IProvenanceSlide | null) {
        if (slide && slide.node) {
            this._traverser.toStateNode(slide.node.id);
        }
        this._selectedSlide = slide;
        this._mitt.emit('slideSelected', slide);
    }

    public get slides() { return this._slides; }

    on(type: string, handler: Handler) {
        this._mitt.on(type, handler);
    }

    off(type: string, handler: Handler) {
        this._mitt.off(type, handler);
    }
}

export { ProvenanceSlidedeck, ProvenanceSlide, Annotation };
export { ProvenanceSlidedeckVisualization } from './provenance-slide-deck-visualization';