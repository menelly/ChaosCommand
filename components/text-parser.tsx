/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
/**
 * REUSABLE TEXT PARSER COMPONENT
 * 
 * Generic component for parsing structured data from unstructured text
 * Can be configured for providers, medications, insurance, etc.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Trash2, 
  Edit3,
  Sparkles,
  FileText
} from 'lucide-react';

import { TextParser } from '@/lib/parsers/core';
import { ParseResult, ParserConfig } from '@/lib/parsers/types';

interface TextParserComponentProps {
  config: ParserConfig;
  onParsed: (data: any) => void;
  placeholder?: string;
  showPreview?: boolean;
  allowManualEdit?: boolean;
  className?: string;
  initialText?: string;
}

export default function TextParserComponent({
  config,
  onParsed,
  placeholder = "Paste your text here...",
  showPreview = true,
  allowManualEdit = true,
  className = "",
  initialText = ""
}: TextParserComponentProps) {
  const [inputText, setInputText] = useState(initialText);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});

  // Create parser instance
  const parser = new TextParser(config);

  // Parse text when input changes
  useEffect(() => {
    if (inputText.trim()) {
      const result = parser.parse(inputText);
      setParseResult(result);
      setEditedData(result.data);
    } else {
      setParseResult(null);
      setEditedData({});
    }
  }, [inputText]);

  const handleClear = () => {
    setInputText('');
    setParseResult(null);
    setEditedData({});
    setIsEditing(false);
  };

  const handleUseResults = () => {
    if (parseResult) {
      const finalData = isEditing ? editedData : parseResult.data;
      onParsed(finalData);
    }
  };

  const handleEditField = (field: string, value: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: {
        ...prev[field],
        value: value
      }
    }));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Input Section */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Paste {config.description}
            </Label>
            {inputText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={placeholder}
            className="min-h-[120px] font-mono text-sm"
          />
          
          <div className="text-xs text-muted-foreground">
            💡 Copy and paste from provider websites, MyChart, emails, or any text source
          </div>
        </div>
      </Card>

      {/* Parse Results */}
      {parseResult && showPreview && (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <Label className="text-base font-medium">Parsed Results</Label>
                <Badge 
                  variant={parseResult.success ? "default" : "destructive"}
                  className="text-xs"
                >
                  {parseResult.success ? 'Success' : 'Partial'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                {allowManualEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    {isEditing ? 'View' : 'Edit'}
                  </Button>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Confidence: {Math.round(parseResult.confidence * 100)}%
                </div>
              </div>
            </div>

            <Separator />

            {/* Parsed Fields */}
            <div className="space-y-4">
              {Object.entries(isEditing ? editedData : parseResult.data).map(([field, data]: [string, any]) => (
                <div key={field} className={`flex gap-3 ${['organization', 'address'].includes(field) ? 'items-start' : 'items-center'}`}>
                  <div className="w-28 text-sm font-medium capitalize text-muted-foreground flex-shrink-0 pt-1">
                    {field.replace(/([A-Z])/g, ' $1').trim()}:
                  </div>
                  
                  {isEditing ? (
                    // Use textarea for long fields, input for short ones
                    ['organization', 'address'].includes(field) ? (
                      <textarea
                        value={data.value}
                        onChange={(e) => handleEditField(field, e.target.value)}
                        className="flex-1 px-2 py-2 text-sm border rounded resize-none min-h-[60px]"
                        rows={3}
                      />
                    ) : (
                      <input
                        type="text"
                        value={data.value}
                        onChange={(e) => handleEditField(field, e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                    )
                  ) : (
                    <div className="flex-1 text-sm break-words leading-relaxed">{data.value}</div>
                  )}

                  <Badge
                    variant="outline"
                    className={`text-xs flex-shrink-0 ${['organization', 'address'].includes(field) ? 'mt-1' : ''} ${getConfidenceColor(data.confidence)}`}
                  >
                    {getConfidenceBadge(data.confidence)}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Errors */}
            {parseResult.errors && parseResult.errors.length > 0 && (
              <div className="mt-4 p-3 bg-warning/5 border border-warning/20 rounded">
                <div className="flex items-center gap-2 text-warning text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Parsing Issues:</span>
                </div>
                <ul className="mt-1 text-xs text-warning list-disc list-inside">
                  {parseResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unparsed Text */}
            {parseResult.unparsedText && parseResult.unparsedText.length > 10 && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Unparsed Text:
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  {parseResult.unparsedText}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleUseResults}
                disabled={!parseResult.success && Object.keys(parseResult.data).length === 0}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Use These Results
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
