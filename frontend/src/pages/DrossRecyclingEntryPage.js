import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ArrowLeft, Plus, X, Calendar } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DrossRecyclingEntryPage({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Entry date for past-dated entries
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [batches, setBatches] = useState([{
    dross_type: 'initial',
    quantity_sent: '',
    high_lead_recovered: '',
    spectro_images: [] // Multiple images support
  }]);
  const [imagePreviews, setImagePreviews] = useState([{}]);

  const addBatch = () => {
    setBatches([...batches, {
      dross_type: 'initial',
      quantity_sent: '',
      high_lead_recovered: '',
      spectro_images: []
    }]);
    setImagePreviews([...imagePreviews, {}]);
  };

  const removeBatch = (index) => {
    if (batches.length > 1) {
      setBatches(batches.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  // Handle multiple files
  const handleMultipleFileChange = async (batchIndex, files) => {
    if (!files || files.length === 0) return;
    
    const compressedFiles = [];
    const previewUrls = [];
    
    for (const file of Array.from(files)) {
      const compressedFile = await compressImage(file);
      compressedFiles.push(compressedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        previewUrls.push(reader.result);
        if (previewUrls.length === files.length) {
          const newPreviews = [...imagePreviews];
          newPreviews[batchIndex] = { 
            ...newPreviews[batchIndex], 
            spectro_images: [...(newPreviews[batchIndex]?.spectro_images || []), ...previewUrls]
          };
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(compressedFile);
    }
    
    const newBatches = [...batches];
    newBatches[batchIndex].spectro_images = [...(newBatches[batchIndex].spectro_images || []), ...compressedFiles];
    setBatches(newBatches);
  };

  // Remove a specific image
  const removeImage = (batchIndex, imageIndex) => {
    const newBatches = [...batches];
    newBatches[batchIndex].spectro_images = newBatches[batchIndex].spectro_images.filter((_, i) => i !== imageIndex);
    setBatches(newBatches);
    
    const newPreviews = [...imagePreviews];
    if (newPreviews[batchIndex]?.spectro_images) {
      newPreviews[batchIndex].spectro_images = newPreviews[batchIndex].spectro_images.filter((_, i) => i !== imageIndex);
      setImagePreviews(newPreviews);
    }
  };

  const handleInputChange = (batchIndex, field, value) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = value;
    setBatches(newBatches);
  };

  const handleSubmit = async () => {
    // Validate all batches
    const incompleteBatches = batches.filter(b => 
      !b.quantity_sent || !b.high_lead_recovered || b.spectro_images.length === 0
    );

    if (incompleteBatches.length > 0) {
      toast.error('Please complete all batch fields including at least one photo');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      
      const batchesData = batches.map(batch => ({
        dross_type: batch.dross_type,
        quantity_sent: parseFloat(batch.quantity_sent),
        high_lead_recovered: parseFloat(batch.high_lead_recovered)
      }));
      
      form.append('batches_data', JSON.stringify(batchesData));
      form.append('entry_date', entryDate); // Send the selected date
      
      batches.forEach(batch => {
        // Send first image for backward compatibility
        if (batch.spectro_images[0]) {
          form.append('files', batch.spectro_images[0]);
        }
      });

      const token = localStorage.getItem('token');
      await axios.post(`${API}/dross-recycling/entries`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${batches.length} batch(es) saved successfully!`);
      navigate('/dross-recycling');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    return batches.every(batch => 
      batch.quantity_sent && batch.high_lead_recovered && batch.spectro_images.length > 0
    );
  };

  // Render multiple image upload
  const renderMultiImageUpload = (batchIndex) => {
    const images = imagePreviews[batchIndex]?.spectro_images || [];
    
    return (
      <div>
        <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
          Spectro Report Images
        </Label>
        
        {/* Existing images */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {images.map((img, imgIdx) => (
              <div key={imgIdx} className="relative">
                <img src={img} alt={`Preview ${imgIdx + 1}`} className="h-24 w-full object-cover rounded-lg border-2 border-slate-200" />
                <button
                  onClick={() => removeImage(batchIndex, imgIdx)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add more images */}
        <label
          htmlFor={`spectro-${batchIndex}`}
          className="border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-yellow-50 hover:border-yellow-300 transition-colors cursor-pointer h-32 flex flex-col items-center justify-center gap-2"
        >
          <div className="flex items-center gap-2">
            <Camera className="w-8 h-8 text-slate-400" />
            <Plus className="w-6 h-6 text-slate-400" />
          </div>
          <span className="text-base font-semibold text-slate-500">
            {images.length > 0 ? 'Add more photos' : 'Tap to capture spectro report'}
          </span>
          <span className="text-xs text-slate-400">Multiple images allowed</span>
        </label>
        
        <input
          id={`spectro-${batchIndex}`}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleMultipleFileChange(batchIndex, e.target.files)}
          className="hidden"
        />
        
        {images.length > 0 && (
          <p className="text-sm text-slate-500 mt-1">{images.length} photo(s) added</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/dross-recycling')}
              data-testid="back-button"
              className="h-12 px-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Add HIGH LEAD Recovery</h1>
              <p className="text-base text-slate-600">{batches.length} batch(es)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Date Picker Card */}
        <Card className="bg-yellow-50 border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <Label className="text-sm font-bold text-yellow-700 uppercase">Entry Date</Label>
            </div>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="h-12 text-lg px-4 border-2 border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 bg-white"
              data-testid="entry-date-input"
            />
            <p className="text-sm text-yellow-600">Select date for this entry (can be past date)</p>
          </div>
        </Card>

        {/* Batch Forms */}
        {batches.map((batch, batchIndex) => (
          <Card key={batchIndex} className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Batch {batchIndex + 1}</h3>
              {batches.length > 1 && (
                <Button
                  onClick={() => removeBatch(batchIndex)}
                  data-testid={`remove-batch-${batchIndex}`}
                  className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Dross Type
                </Label>
                <Select
                  value={batch.dross_type}
                  onValueChange={(value) => handleInputChange(batchIndex, 'dross_type', value)}
                >
                  <SelectTrigger className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial" className="text-xl">Initial Dross</SelectItem>
                    <SelectItem value="2nd" className="text-xl">2nd Dross</SelectItem>
                    <SelectItem value="3rd" className="text-xl">3rd Dross</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Quantity Sent for Recycling (KG)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={batch.quantity_sent}
                  onChange={(e) => handleInputChange(batchIndex, 'quantity_sent', e.target.value)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  HIGH LEAD Recovered (KG)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={batch.high_lead_recovered}
                  onChange={(e) => handleInputChange(batchIndex, 'high_lead_recovered', e.target.value)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              {renderMultiImageUpload(batchIndex)}
            </div>
          </Card>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={addBatch}
            data-testid="add-batch-button"
            className="flex-1 h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
          >
            <Plus className="w-6 h-6 mr-2" />
            Add Another Batch
          </Button>
          <Button
            onClick={handleSubmit}
            data-testid="submit-entry-button"
            disabled={!canSubmit() || loading}
            className="flex-1 h-16 text-xl font-bold bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : `Save ${batches.length} Batch(es)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
