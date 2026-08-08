"use client";

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Loader2, RefreshCw, Network } from 'lucide-react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function GraphView({ data }: { data: any }) {
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchGraph = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:8000/api/graph', {
        data: data
      }, {
        headers: {
          'x-gemini-api-key': typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : ''
        }
      });
      setGraphData(response.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate graph from your brain dump.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [data]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to color nodes based on their group
  const getNodeColor = (node: any) => {
    switch (node.group?.toLowerCase()) {
      case 'task': return '#ef4444'; // red
      case 'event': return '#fbbf24'; // amber
      case 'person': return '#3b82f6'; // blue
      case 'concept': return '#8b5cf6'; // violet
      default: return '#10b981'; // emerald
    }
  };

  return (
    <div className="bg-white/5 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[700px]">
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-emerald-400" />
          Mind Map
        </h2>
        <button 
          onClick={fetchGraph}
          disabled={isLoading}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Regenerate
        </button>
      </div>
      
      <div className="flex-1 bg-gray-950 relative" ref={containerRef}>
        {isLoading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 z-10">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Analyzing your brain to draw connections...</p>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {graphData.nodes.length > 0 && (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="label"
            nodeColor={getNodeColor}
            nodeRelSize={6}
            linkColor={() => 'rgba(255,255,255,0.2)'}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkLabel="label"
            backgroundColor="#030712" // matches gray-950 roughly
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        )}
      </div>
      <div className="bg-gray-950 p-3 border-t border-gray-800 flex justify-center gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Tasks</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Events</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> People</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-violet-500"></span> Concepts</span>
      </div>
    </div>
  );
}
