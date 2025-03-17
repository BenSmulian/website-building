'use client';

import { useState, useRef } from 'react';

export default function Home() {
  const [elements, setElements] = useState([]);
  const [dragInfo, setDragInfo] = useState({ isDragging: false, elementId: null, startX: 0, startY: 0, elementX: 0, elementY: 0 });
  const [resizeInfo, setResizeInfo] = useState({ isResizing: false, elementId: null, offsetX: 0, offsetY: 0 });
  const [draggingId, setDraggingId] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [previewMode, setPreviewMode] = useState('pc');
  const canvasRef = useRef(null);

  const SNAP_THRESHOLD = 10;

  const previewDimensions = {
    pc: { width: '70vw', minHeight: '85vh' },
    tablet: { width: '50vw', minHeight: '70vh' },
    phone: { width: '30vw', minHeight: '60vh' },
  };

  const addElement = (type) => {
    const newElement = {
      id: Date.now(),
      type,
      x: 20, // % of canvas width
      y: 20, // % of initial viewport height
      width: 10, // % of canvas width
      height: 10, // vh
      rotation: 0,
      opacity: 1,
      backgroundOpacity: 1,
      fillColor: type === 'div' ? '#3B82F6' : type === 'btn' ? '#10B981' : '#000000',
      borderWidth: 1,
      borderColor: '#000000',
      cornerRadius: 0,
      ...(type === 'img' && {
        imageUrl: '',
        uploadedImage: null,
      }),
      ...(type === 'text' && {
        textContent: 'Enter text here',
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        textColor: '#000000',
      }),
    };
    setElements([...elements, newElement]);
  };

  const handleMouseDown = (e, elementId, action) => {
    e.preventDefault();
    e.stopPropagation();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const element = elements.find(el => el.id === elementId);
    const viewportHeight = window.innerHeight;
    const initialHeight = parseFloat(previewDimensions[previewMode].minHeight) / 100 * viewportHeight;

    if (action === 'drag') {
      setDragInfo({
        isDragging: true,
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        elementX: element.x,
        elementY: element.y,
      });
    } else if (action === 'resize') {
      const mouseX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
      const mouseY = ((e.clientY - canvasRect.top) / initialHeight) * 100;
      setResizeInfo({
        isResizing: true,
        elementId,
        offsetX: mouseX - (element.x + element.width),
        offsetY: mouseY - (element.y + element.height * (initialHeight / viewportHeight)),
      });
    }
    setSelectedElementId(elementId);
  };

  const handleMouseMove = (e) => {
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const initialHeight = parseFloat(previewDimensions[previewMode].minHeight) / 100 * viewportHeight;
    const mouseX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    const mouseY = ((e.clientY - canvasRect.top) / initialHeight) * 100;

    if (dragInfo.isDragging) {
      const deltaX = ((e.clientX - dragInfo.startX) / canvasRect.width) * 100;
      const deltaY = ((e.clientY - dragInfo.startY) / initialHeight) * 100;
      let newX = dragInfo.elementX + deltaX;
      let newY = dragInfo.elementY + deltaY;
      const draggedElement = elements.find(el => el.id === dragInfo.elementId);

      // Convert positions to vh for vertical snapping
      const draggedTopVh = newY * initialHeight / viewportHeight;
      const draggedBottomVh = draggedTopVh + draggedElement.height;
      const draggedCenterX = newX + draggedElement.width / 2; // % of canvas width
      const draggedCenterYVh = draggedTopVh + draggedElement.height / 2; // vh

      elements.forEach(el => {
        if (el.id !== dragInfo.elementId) {
          // X snapping (edges, in % of canvas width)
          if (Math.abs(newX - (el.x + el.width)) <= SNAP_THRESHOLD / 2) newX = el.x + el.width;
          if (Math.abs((newX + draggedElement.width) - el.x) <= SNAP_THRESHOLD / 2) newX = el.x - draggedElement.width;

          // Y snapping (edges, converted to vh)
          const elTopVh = el.y * initialHeight / viewportHeight;
          const elBottomVh = elTopVh + el.height;
          if (Math.abs(draggedTopVh - elBottomVh) <= SNAP_THRESHOLD / 2 * (initialHeight / viewportHeight)) {
            newY = (elBottomVh - draggedTopVh + draggedTopVh) * viewportHeight / initialHeight;
          }
          if (Math.abs(draggedBottomVh - elTopVh) <= SNAP_THRESHOLD / 2 * (initialHeight / viewportHeight)) {
            newY = (elTopVh - draggedElement.height) * viewportHeight / initialHeight;
          }

          // X snapping to horizontal middle (in % of canvas width)
          const elCenterX = el.x + el.width / 2;
          if (Math.abs(draggedCenterX - elCenterX) <= SNAP_THRESHOLD / 2) {
            newX = elCenterX - draggedElement.width / 2;
          }

          // Y snapping to vertical middle (in vh)
          const elCenterYVh = elTopVh + el.height / 2;
          if (Math.abs(draggedCenterYVh - elCenterYVh) <= SNAP_THRESHOLD / 2 * (initialHeight / viewportHeight)) {
            newY = (elCenterYVh - draggedElement.height / 2) * viewportHeight / initialHeight;
          }
        }
      });

      // Constraints
      newX = Math.max(0, Math.min(newX, 100 - draggedElement.width));
      if (draggedTopVh < 0) {
        newY = 0; // Force top edge to 0vh
      } else {
        newY = Math.max(newY, 0); // Allow dragging below initial height to expand canvas
      }

      setElements(elements.map(el =>
        el.id === dragInfo.elementId ? { ...el, x: newX, y: newY } : el
      ));
    }

    if (resizeInfo.isResizing) {
      setElements(elements.map(el => {
        if (el.id === resizeInfo.elementId) {
          const newWidth = Math.max(5, Math.min(mouseX - el.x - resizeInfo.offsetX, 100 - el.x));
          const newHeight = Math.max(5, (mouseY - el.y - resizeInfo.offsetY) * (viewportHeight / initialHeight));
          return { ...el, width: newWidth, height: newHeight };
        }
        return el;
      }));
    }
  };

  const handleMouseUp = () => {
    setDragInfo({ isDragging: false, elementId: null, startX: 0, startY: 0, elementX: 0, elementY: 0 });
    setResizeInfo({ isResizing: false, elementId: null, offsetX: 0, offsetY: 0 });
  };

  const updateElementProperty = (elementId, property, value) => {
    setElements(elements.map(el =>
      el.id === elementId ? { ...el, [property]: value } : el
    ));
  };

  const deleteElement = (elementId) => {
    setElements(elements.filter(el => el.id !== elementId));
    setSelectedElementId(null);
  };

  const saveElements = () => {
    localStorage.setItem('savedElements', JSON.stringify(elements));
    alert('Elements saved!');
  };

  const loadElements = () => {
    const saved = localStorage.getItem('savedElements');
    if (saved) setElements(JSON.parse(saved));
  };

  const clearCanvas = () => {
    setElements([]);
    setSelectedElementId(null);
  };

  const exportToHTML = () => {
    const viewportHeight = window.innerHeight;
    const initialHeight = parseFloat(previewDimensions[previewMode].minHeight) / 100 * viewportHeight;
    const maxHeight = Math.max(...elements.map(el => (el.y * initialHeight / viewportHeight) + el.height), parseFloat(previewDimensions[previewMode].minHeight));
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Design</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            width: 100vw;
            background-color: #f0f0f0;
            overflow-x: hidden;
        }
        .canvas {
            position: relative;
            width: 100%;
            height: ${maxHeight}vh;
            background-color: #e5e5e5;
        }
        ${elements.map(element => {
          const rgbaFillColor = `${element.fillColor}${Math.round(element.backgroundOpacity * 255).toString(16).padStart(2, '0')}`;
          const topPosition = element.y * initialHeight / viewportHeight; // Convert y to vh
          let styles = `
            position: absolute;
            left: ${element.x}%;
            top: ${topPosition}vh;
            width: ${element.width}%;
            height: ${element.height}vh;
            transform: rotate(${element.rotation}deg);
            opacity: ${element.opacity};
            background-color: ${rgbaFillColor};
            border: ${element.borderWidth}px solid ${element.borderColor};
            border-radius: ${element.cornerRadius}px;
            z-index: ${elements.findIndex(el => el.id === element.id)};
          `;
          
          switch (element.type) {
            case 'div':
              return `.element-${element.id} { ${styles} }`;
            case 'img':
              return `.element-${element.id} { 
                ${styles}
                overflow: hidden;
              }
              .element-${element.id} img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: ${element.cornerRadius}px;
              }`;
            case 'btn':
              return `.element-${element.id} { 
                ${styles}
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
              }`;
            case 'text':
              return `.element-${element.id} { 
                ${styles}
                font-family: ${element.fontFamily};
                font-size: clamp(12px, ${element.fontSize / 100 * 4}vw, ${element.fontSize}px);
                font-weight: ${element.fontWeight};
                font-style: ${element.fontStyle};
                text-decoration: ${element.textDecoration};
                text-align: ${element.textAlign};
                line-height: ${element.lineHeight};
                letter-spacing: ${element.letterSpacing}px;
                color: ${element.textColor};
                overflow: hidden;
              }`;
          }
        }).join('\n')}
    </style>
</head>
<body>
    <div class="canvas">
        ${elements.map(element => {
          switch (element.type) {
            case 'div':
              return `<div class="element-${element.id}"></div>`;
            case 'img':
              return `<div class="element-${element.id}"><img src="${element.uploadedImage || element.imageUrl || 'https://via.placeholder.com/100'}" alt="image"></div>`;
            case 'btn':
              return `<button class="element-${element.id}">Button</button>`;
            case 'text':
              return `<div class="element-${element.id}">${element.textContent.replace(/\n/g, '<br>')}</div>`;
          }
        }).join('\n        ')}
    </div>
</body>
</html>
    `.trim();

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exported_design.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDragStart = (e, elementId) => {
    e.dataTransfer.setData('text/plain', elementId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(elementId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setHoverIndex(index);
  };

  const handleDragLeave = () => {
    setHoverIndex(-1);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (draggedId === targetId) return;

    const newElements = [...elements];
    const draggedIndex = newElements.findIndex(el => el.id === draggedId);
    const targetIndex = newElements.findIndex(el => el.id === targetId);
    const [draggedElement] = newElements.splice(draggedIndex, 1);
    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
    newElements.splice(adjustedTargetIndex, 0, draggedElement);
    
    setElements(newElements);
    setDraggingId(null);
    setHoverIndex(-1);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setHoverIndex(-1);
  };

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedElementId(null);
    }
  };

  const renderElement = (element) => {
    const viewportHeight = window.innerHeight;
    const initialHeight = parseFloat(previewDimensions[previewMode].minHeight) / 100 * viewportHeight;
    const topPosition = element.y * initialHeight / viewportHeight; // Convert y to vh
    const rgbaFillColor = `${element.fillColor}${Math.round(element.backgroundOpacity * 255).toString(16).padStart(2, '0')}`;
    let styles = {
      position: 'absolute',
      left: `${element.x}%`,
      top: `${topPosition}vh`,
      width: `${element.width}%`,
      height: `${element.height}vh`,
      transform: `rotate(${element.rotation}deg)`,
      opacity: element.opacity,
      backgroundColor: rgbaFillColor,
      border: `${element.borderWidth}px solid ${element.borderColor}`,
      borderRadius: `${element.cornerRadius}px`,
      zIndex: elements.findIndex(el => el.id === element.id),
    };

    let content;
    switch (element.type) {
      case 'div':
        content = <div className="w-full h-full" />;
        break;
      case 'img':
        content = (
          <img
            src={element.uploadedImage || element.imageUrl || 'https://via.placeholder.com/100'}
            alt="draggable"
            className="w-full h-full object-cover"
            style={{ borderRadius: `${element.cornerRadius}px` }}
          />
        );
        break;
      case 'btn':
        content = <button className="w-full h-full text-white">Button</button>;
        break;
      case 'text':
        content = (
          <div
            className="w-full h-full overflow-hidden"
            style={{
              fontFamily: element.fontFamily,
              fontSize: `${element.fontSize}px`,
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              textDecoration: element.textDecoration,
              textAlign: element.textAlign,
              lineHeight: element.lineHeight,
              letterSpacing: `${element.letterSpacing}px`,
              color: element.textColor,
            }}
          >
            {element.textContent}
          </div>
        );
        break;
    }

    return (
      <div
        key={element.id}
        style={styles}
        className={`cursor-move ${selectedElementId === element.id ? 'ring-2 ring-blue-500' : 'border border-black'}`}
        onMouseDown={(e) => handleMouseDown(e, element.id, 'drag')}
      >
        {content}
        <div
          className={`absolute -right-1 -bottom-1 w-3 h-3 bg-red-500 cursor-se-resize transition-colors duration-200 ${
            resizeInfo.elementId === element.id && resizeInfo.isResizing ? 'bg-red-700' : 'hover:bg-red-300'
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseDown(e, element.id, 'resize');
          }}
        />
      </div>
    );
  };

  const renderPropertiesPanel = () => {
    const selectedElement = elements.find(el => el.id === selectedElementId);

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          updateElementProperty(selectedElementId, 'uploadedImage', event.target.result);
          updateElementProperty(selectedElementId, 'imageUrl', '');
        };
        reader.readAsDataURL(file);
      }
    };

    const handleImageUrlChange = (e) => {
      const url = e.target.value;
      updateElementProperty(selectedElementId, 'imageUrl', url);
      updateElementProperty(selectedElementId, 'uploadedImage', null);
    };

    const clearImage = () => {
      updateElementProperty(selectedElementId, 'uploadedImage', null);
      updateElementProperty(selectedElementId, 'imageUrl', '');
    };

    return (
      <div className="fixed top-0 right-0 h-screen w-[20%] bg-gray-800 text-white p-4 overflow-y-auto z-40">
        <h3 className="text-lg font-bold mb-4">Properties</h3>
        {selectedElement ? (
          <div className="space-y-4">
            <div>
              <label className="block">X (%)</label>
              <input
                type="number"
                value={selectedElement.x}
                onChange={(e) => updateElementProperty(selectedElementId, 'x', parseFloat(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            <div>
              <label className="block">Y (% of initial height)</label>
              <input
                type="number"
                value={selectedElement.y}
                onChange={(e) => updateElementProperty(selectedElementId, 'y', parseFloat(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            <div>
              <label className="block">Width (%)</label>
              <input
                type="number"
                value={selectedElement.width}
                onChange={(e) => updateElementProperty(selectedElementId, 'width', parseFloat(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            <div>
              <label className="block">Height (vh)</label>
              <input
                type="number"
                value={selectedElement.height}
                onChange={(e) => updateElementProperty(selectedElementId, 'height', parseFloat(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            <div>
              <label className="block">Rotation (deg)</label>
              <input
                type="number"
                value={selectedElement.rotation}
                onChange={(e) => updateElementProperty(selectedElementId, 'rotation', parseInt(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            <div>
              <label className="block">Opacity (0-1)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={selectedElement.opacity}
                onChange={(e) => updateElementProperty(selectedElementId, 'opacity', parseFloat(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            <div>
              <label className="block">Background Opacity (0-1)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={selectedElement.backgroundOpacity}
                onChange={(e) => updateElementProperty(selectedElementId, 'backgroundOpacity', parseFloat(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            <div>
              <label className="block">Fill Color</label>
              <input
                type="color"
                value={selectedElement.fillColor}
                onChange={(e) => updateElementProperty(selectedElementId, 'fillColor', e.target.value)}
                className="w-full h-10 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block">Border Width (px)</label>
              <input
                type="number"
                min="0"
                value={selectedElement.borderWidth}
                onChange={(e) => updateElementProperty(selectedElementId, 'borderWidth', parseInt(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            <div>
              <label className="block">Border Color</label>
              <input
                type="color"
                value={selectedElement.borderColor}
                onChange={(e) => updateElementProperty(selectedElementId, 'borderColor', e.target.value)}
                className="w-full h-10 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block">Corner Radius (px)</label>
              <input
                type="number"
                min="0"
                value={selectedElement.cornerRadius}
                onChange={(e) => updateElementProperty(selectedElementId, 'cornerRadius', parseInt(e.target.value))}
                className="w-full bg-gray-700 p-1 rounded"
              />
            </div>
            {selectedElement.type === 'img' && (
              <>
                <div>
                  <label className="block">Upload Image {selectedElement.uploadedImage && <span className="text-green-400">(Active)</span>}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full bg-gray-700 p-1 rounded"
                  />
                </div>
                <div>
                  <label className="block">Image URL {selectedElement.imageUrl && <span className="text-green-400">(Active)</span>}</label>
                  <input
                    type="text"
                    value={selectedElement.imageUrl || ''}
                    onChange={handleImageUrlChange}
                    placeholder="Enter image URL"
                    className="w-full bg-gray-700 p-1 rounded"
                  />
                </div>
                {(selectedElement.uploadedImage || selectedElement.imageUrl) && (
                  <button
                    onClick={clearImage}
                    className="w-full p-2 bg-red-500 hover:bg-red-600 rounded text-white"
                  >
                    Clear Image
                  </button>
                )}
              </>
            )}
            {selectedElement.type === 'text' && (
              <>
                <div>
                  <label className="block">Text Content</label>
                  <textarea
                    value={selectedElement.textContent}
                    onChange={(e) => updateElementProperty(selectedElementId, 'textContent', e.target.value)}
                    className="w-full bg-gray-700 p-1 rounded"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block">Font Family</label>
                  <select
                    value={selectedElement.fontFamily}
                    onChange={(e) => updateElementProperty(selectedElementId, 'fontFamily', e.target.value)}
                    className="w-full bg-gray-700 p-1 rounded"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>
                <div>
                  <label className="block">Font Size (px)</label>
                  <input
                    type="number"
                    min="1"
                    value={selectedElement.fontSize}
                    onChange={(e) => updateElementProperty(selectedElementId, 'fontSize', parseInt(e.target.value))}
                    className="w-full bg-gray-700 p-1 rounded"
                  />
                </div>
                <div>
                  <label className="block">Font Weight</label>
                  <select
                    value={selectedElement.fontWeight}
                    onChange={(e) => updateElementProperty(selectedElementId, 'fontWeight', e.target.value)}
                    className="w-full bg-gray-700 p-1 rounded"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="bolder">Bolder</option>
                    <option value="lighter">Lighter</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                    <option value="600">600</option>
                    <option value="700">700</option>
                    <option value="800">800</option>
                    <option value="900">900</option>
                  </select>
                </div>
                <div>
                  <label className="block">Font Style</label>
                  <select
                    value={selectedElement.fontStyle}
                    onChange={(e) => updateElementProperty(selectedElementId, 'fontStyle', e.target.value)}
                    className="w-full bg-gray-700 p-1 rounded"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Italic</option>
                    <option value="oblique">Oblique</option>
                  </select>
                </div>
                <div>
                  <label className="block">Text Decoration</label>
                  <select
                    value={selectedElement.textDecoration}
                    onChange={(e) => updateElementProperty(selectedElementId, 'textDecoration', e.target.value)}
                    className="w-full bg-gray-700 p-1 rounded"
                  >
                    <option value="none">None</option>
                    <option value="underline">Underline</option>
                    <option value="overline">Overline</option>
                    <option value="line-through">Line-through</option>
                  </select>
                </div>
                <div>
                  <label className="block">Text Align</label>
                  <select
                    value={selectedElement.textAlign}
                    onChange={(e) => updateElementProperty(selectedElementId, 'textAlign', e.target.value)}
                    className="w-full bg-gray-700 p-1 rounded"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>
                <div>
                  <label className="block">Line Height</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="3"
                    value={selectedElement.lineHeight}
                    onChange={(e) => updateElementProperty(selectedElementId, 'lineHeight', parseFloat(e.target.value))}
                    className="w-full bg-gray-700 p-1 rounded"
                  />
                </div>
                <div>
                  <label className="block">Letter Spacing (px)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedElement.letterSpacing}
                    onChange={(e) => updateElementProperty(selectedElementId, 'letterSpacing', parseFloat(e.target.value))}
                    className="w-full bg-gray-700 p-1 rounded"
                  />
                </div>
                <div>
                  <label className="block">Text Color</label>
                  <input
                    type="color"
                    value={selectedElement.textColor}
                    onChange={(e) => updateElementProperty(selectedElementId, 'textColor', e.target.value)}
                    className="w-full h-10 bg-gray-700 rounded"
                  />
                </div>
              </>
            )}
            <button
              onClick={() => deleteElement(selectedElementId)}
              className="w-full p-2 bg-red-600 hover:bg-red-700 rounded text-white mt-4"
            >
              Delete Element
            </button>
          </div>
        ) : (
          <p className="text-gray-400">No element selected</p>
        )}
      </div>
    );
  };

  const getCanvasHeight = () => {
    const viewportHeight = window.innerHeight;
    const initialHeight = parseFloat(previewDimensions[previewMode].minHeight) / 100 * viewportHeight;
    const maxHeight = Math.max(...elements.map(el => (el.y * initialHeight / viewportHeight) + el.height), parseFloat(previewDimensions[previewMode].minHeight));
    return `${maxHeight}vh`;
  };

  return (
    <div
      className="relative min-h-screen w-screen bg-white"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="LeftBar fixed top-0 left-0 h-screen w-[10%] bg-black flex flex-col z-40">
        <div className="flex-shrink-0">
          <button className="block w-full p-4 text-white bg-gray-800 hover:bg-gray-600 active:bg-gray-900" onClick={() => addElement('div')}>
            Add div
          </button>
          <button className="block w-full p-4 text-white bg-gray-800 hover:bg-gray-600 active:bg-gray-900" onClick={() => addElement('img')}>
            Add img
          </button>
          <button className="block w-full p-4 text-white bg-gray-800 hover:bg-gray-600 active:bg-gray-900" onClick={() => addElement('btn')}>
            Add btn
          </button>
          <button className="block w-full p-4 text-white bg-gray-800 hover:bg-gray-600 active:bg-gray-900" onClick={() => addElement('text')}>
            Add text
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto mt-4">
          <h3 className="text-white text-center font-bold mb-2">Layers</h3>
          {elements.length === 0 ? (
            <p className="text-white text-center">No layers</p>
          ) : (
            <ul className="text-white relative">
              {elements.map((el, index) => (
                <div key={el.id} className="relative">
                  {hoverIndex === index && draggingId !== el.id && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 -translate-y-1 z-10" />
                  )}
                  <li
                    draggable
                    onDragStart={(e) => handleDragStart(e, el.id)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, el.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`p-2 bg-gray-700 m-1 rounded cursor-move hover:bg-gray-600 ${
                      draggingId === el.id ? 'opacity-50' : selectedElementId === el.id ? 'bg-blue-600' : ''
                    }`}
                  >
                    {el.type} (Layer {index + 1})
                  </li>
                  {index === elements.length - 1 && hoverIndex === index + 1 && draggingId !== el.id && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 translate-y-1 z-10" />
                  )}
                </div>
              ))}
            </ul>
          )}
        </div>
      </div>

      {renderPropertiesPanel()}

      <div className="TopBar fixed top-0 left-[10%] bg-black h-[10%] w-[70%] flex items-center z-40">
        <h3 className="w-[200px] text-3xl font-extrabold text-white flex items-center px-4">preview:</h3>
        <div className="flex items-center gap-2">
          <button 
            className={`p-2 text-white ${previewMode === 'tablet' ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-gray-600 active:bg-gray-900`}
            onClick={() => setPreviewMode('tablet')}
          >
            tablet
          </button>
          <button 
            className={`p-2 text-white ${previewMode === 'pc' ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-gray-600 active:bg-gray-900`}
            onClick={() => setPreviewMode('pc')}
          >
            pc
          </button>
          <button 
            className={`p-2 text-white ${previewMode === 'phone' ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-gray-600 active:bg-gray-900`}
            onClick={() => setPreviewMode('phone')}
          >
            phone
          </button>
          <button className="p-2 text-white bg-gray-800 hover:bg-gray-600 active:bg-gray-900" onClick={saveElements}>Save</button>
          <button className="p-2 text-white bg-gray-800 hover:bg-gray-600 active:bg-gray-900" onClick={loadElements}>Load</button>
          <button className="p-2 text-white bg-gray-800 hover:bg-gray-600 active:bg-gray-900" onClick={clearCanvas}>New</button>
          <button className="p-2 text-white bg-gray-800 hover:bg-gray-600 active:bg-gray-900" onClick={exportToHTML}>Export</button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="canvas absolute top-[10%] left-[10%] bg-gray-100"
        style={{
          width: previewDimensions[previewMode].width,
          height: getCanvasHeight(),
        }}
        onClick={handleCanvasClick}
      >
        {elements.map(element => renderElement(element))}
      </div>
    </div>
  );
}