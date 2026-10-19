"""Load the published frame classifier without mapping a multi-GB float checkpoint.

Linear weights are streamed individually and packed as int8 on CPU. Other layers
keep the published float32 values. No checkpoint Python code/pickle is executed.
"""
from __future__ import annotations
import json
import struct
from pathlib import Path
import numpy as np


class TensorReader:
    def __init__(self, path: Path):
        self.file=path.open("rb")
        header_size=struct.unpack("<Q",self.file.read(8))[0]
        if header_size>32*1024*1024: raise ValueError("Unexpected tensor header size")
        self.header=json.loads(self.file.read(header_size))
        self.base=8+header_size
        self.size=path.stat().st_size

    def read(self, name):
        import torch
        info=self.header[name]
        begin,end=info["data_offsets"]
        if not 0<=begin<=end<=self.size-self.base: raise ValueError("Invalid model tensor bounds")
        dtype={"F32":np.float32,"F16":np.float16,"I64":np.int64,"I32":np.int32}.get(info["dtype"])
        if dtype is None: raise ValueError("Unsupported model tensor dtype")
        if end-begin != int(np.prod(info["shape"]))*np.dtype(dtype).itemsize: raise ValueError("Invalid model tensor size")
        self.file.seek(self.base+begin)
        data=self.file.read(end-begin)
        if len(data)!=end-begin: raise ValueError("Incomplete model tensor")
        return torch.from_numpy(np.frombuffer(data,dtype=dtype).reshape(info["shape"]).copy())

    def close(self): self.file.close()


def load_quantized_classifier(directory: Path):
    import torch
    from torch import nn
    from transformers import Wav2Vec2BertConfig, Wav2Vec2BertForAudioFrameClassification
    original_linear=nn.Linear

    class DeferredLinear(original_linear):
        def __init__(self,*args,**kwargs):
            kwargs["device"]="meta"
            super().__init__(*args,**kwargs)

    config=Wav2Vec2BertConfig.from_pretrained(str(directory),local_files_only=True)
    # Construct small non-linear layers normally; large linears occupy no memory yet.
    nn.Linear=DeferredLinear
    try:
        model=Wav2Vec2BertForAudioFrameClassification(config)
    finally:
        nn.Linear=original_linear
    linears={name:module for name,module in model.named_modules() if isinstance(module,DeferredLinear)}
    reader=TensorReader(directory/"model.safetensors")
    try:
        with torch.no_grad():
            for name,parameter in model.named_parameters():
                if parameter.device.type!="meta": parameter.copy_(reader.read(name))
            for name,module in linears.items():
                weight=reader.read(name+".weight").float()
                scales=(weight.abs().amax(dim=1)/127).clamp_min(1e-8).double()
                quantized=torch.quantize_per_channel(weight,scales,torch.zeros(len(scales),dtype=torch.int64),0,torch.qint8)
                bias=reader.read(name+".bias").float() if module.bias is not None else None
                replacement=torch.ao.nn.quantized.dynamic.Linear(module.in_features,module.out_features,bias is not None,dtype=torch.qint8)
                replacement.set_weight_bias(quantized,bias)
                parent_name,_,attribute=name.rpartition(".")
                parent=model.get_submodule(parent_name) if parent_name else model
                setattr(parent,attribute,replacement)
                del weight,quantized
        if any(p.device.type=="meta" for p in model.parameters()): raise ValueError("Unloaded classifier parameters")
        return model.eval()
    finally: reader.close()
