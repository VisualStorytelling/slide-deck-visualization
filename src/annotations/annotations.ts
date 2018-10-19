import { SlideAnnotation, ScreenCoordinates, IProvenanceSlidedeck } from '@visualstorytelling/provenance-core';

const annotationsDiv = document.createElement('div');
annotationsDiv.style.position = 'absolute';
annotationsDiv.style.top = '0px';
annotationsDiv.style.left = '0px';
annotationsDiv.style.zIndex = '1000';
document.body.appendChild(annotationsDiv);


const updateAnnotation = (annotation: SlideAnnotation<any>, elm: HTMLInputElement) => {
  elm.value = annotation.data.text;
  const coordinates = annotation.screenCoords;
  elm.style.left = `${coordinates.x}px`;
  elm.style.top = `${coordinates.y}px`;
};

export const addButton = (slideDeck: IProvenanceSlidedeck) => {
  const button = document.createElement('button');
  button.id = "add-annotation";
  button.innerHTML = 'add Annotation';
  document.body.appendChild(button);
  button.onclick = () => {
    if (slideDeck.selectedSlide) {
      const annotation = new SlideAnnotation<ScreenCoordinates>(
        { text: 'changeme' },
        { x: 100, y: 100},
        'identityAnnotator',
      );
      slideDeck.selectedSlide.addAnnotation(annotation);

      const elm = document.createElement('input');
      elm.className = 'annotation';
      elm.draggable = true;
      annotationsDiv.appendChild(elm);

      updateAnnotation(annotation, elm);
      annotation.on('change', () => {
        updateAnnotation(annotation, elm);
      });
      annotation.on('move', () => {
        updateAnnotation(annotation, elm);
      });
      elm.addEventListener('dragend', (event: DragEvent) => {
        console.log('dragend');
        console.log(annotation.tryMove({x: event.clientX, y: event.clientY}));
      });
    }

  };
};
