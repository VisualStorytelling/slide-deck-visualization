import * as ProvenanceAPI from "@visualstorytelling/provenance-core";

export type Annotation = any;

export interface IProvenanceSlide {
    id: string;
    node: ProvenanceAPI.ProvenanceNode | null;    
    name: string;
    duration: number;    
    delay: number;
    annotations: Annotation[];

    addAnnotation(annotation: Annotation): void;
    removeAnnotation(annotation: Annotation): void;
}

export interface IProvenanceSlidedeck {
    /**
     * Application metadata
     */
    readonly application: ProvenanceAPI.Application;
    slides: IProvenanceSlide[];
    selectedSlide: IProvenanceSlide | null;
    graph: ProvenanceAPI.IProvenanceGraph;

    addSlide(slide?: IProvenanceSlide, index?: number): IProvenanceSlide;
    removeSlide(slide: IProvenanceSlide): void;
    removeSlideAtIndex(index: number): void;
    moveSlide(indexFrom: number, indexTo: number, count?: number): void;

    startTime(slide: IProvenanceSlide): number;
    slideAtTime(time: number): IProvenanceSlide | null;
    
    /**
     * Available events: 
     * * slideAdded, emitted when slide is added via this.addSlide()
     * * slideSelected, emitted when this.selectedSlide is changed
     * * slidesMoved, emitted when this.moveSlide() is called
     * * slideRemoved, emitted when this.removeSlide() is called
     *
     * @param type
     * @param handler
     */
    on(type: string, handler: ProvenanceAPI.Handler): void;
    off(type: string, handler: ProvenanceAPI.Handler): void;
  }

  export interface IProvenanceSlidedeckVisualization {

  }