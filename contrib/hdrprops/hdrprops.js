/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2024, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @module HdrPropertiesCapabilityFilter
 * @param {object=} dashjsMediaPlayer - dashjs reference
 */
// eslint-disable-next-line no-unused-vars
var HdrPropsCapFilter = function (dashjsMediaPlayer) {

    var player = this.player = dashjsMediaPlayer;
    var logger;

    const EssentialProperties = [

        // Video Full Range specifying the scaling and offset values
        //  applied in association with the Video matrix colour coefficients.
        // 0 : smpte-range (default)
        // 1 : full-range
        'urn:mpeg:mpegB:cicp:VideoFullRangeFlag',

        // Indicates that the player has to support the specified matrix
        // coefficients in order to correctly present any Representation
        // within the AdaptationSet
        // 0 = identity
        // 1 = BT.709
        // 5 = BT.601 (PAL)
        // 6 = BT.601 (NTSC)
        // 9 = BT.2020 (non-constant luma)
        // 10 = BT.2020 (constant luma)
        'urn:mpeg:mpegB:cicp:MatrixCoefficients',

        // Indicates that the player has to support the specified colour
        // primaries in order to correctly present any Representation
        // within the AdaptationSet.
        // 1 = BT.709
        // 5 = BT.601 (PAL)
        // 6 = BT.601 (NTSC)
        // 9 = BT.2020
        // 11 = SMPTE 431-2 (DCI-P3 theatre)
        // 12 = SMPTE 431-1 (DCI-P3 D65 display)
        'urn:mpeg:mpegB:cicp:ColourPrimaries',

        // Indicates that the player has to support the specified transfer
        // characteristics in order to correctly present any
        // Representation within the AdaptationSet.
        // 1 = BT.709 (gamma)
        // 6 = BT.601 (PAL or NTSC)
        // 8 = linear
        // 14 = BT.2020 OETF (10-bit gamma)
        // 15 = BT.2020 OETF (12-bit gamma)
        // 16 = BT.2100 / SMPTE.2084 PQ
        // 18 = BT.2100 HLG
        'urn:mpeg:mpegB:cicp:TransferCharacteristics',
    ];

    // remove optioanlly existing properties to avoid duplicates
    var removeProperties = function (props) {
        return props.filter(p => {
            return !(p.schemeIdUri && (EssentialProperties.includes(p.schemeIdUri)));
        });
    };

    var filterCapabilities = async function (representation) {
        const mimeType = `${representation.mimeType};codecs="${representation.codecs}"`
        const isVideo = mimeType.startsWith('video')
        let supported = true;

        if (isVideo) {
            const config = {
                type: 'media-source',
                video: {
                    contentType: mimeType,
                    framerate: representation.frameRate,
                    width: representation.width,
                    height: representation.height,
                    bitrate: representation.bandwidth,
                    colorGamut: 'srgb',
                    transferFunction: 'srgb'
                }
            }

            // const essProp = representation.EssentialProperty.filter(p=>{return p;});

            for (const prop of representation.EssentialProperty || []) {
                if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:ColourPrimaries' && [1].includes(prop.value))
                    config.video.colorGamut = 'srgb'
                else if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:ColourPrimaries' && [11, 12].includes(prop.value))
                    config.video.colorGamut = 'p3'
                else if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:ColourPrimaries' && [9].includes(prop.value))
                    config.video.colorGamut = 'rec2020'
                else if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:ColourPrimaries')
                    supported = false;

                if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:TransferCharacteristics' && [1, 14, 15].includes(prop.value))
                    config.video.transferFunction = 'srgb'
                else if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:TransferCharacteristics' && [16].includes(prop.value))
                    config.video.transferFunction = 'pq'
                else if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:TransferCharacteristics' && [18].includes(prop.value))
                    config.video.transferFunction = 'hlg'
                else if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:TransferCharacteristics')
                    supported = false;

                if (prop.schemeIdUri == 'urn:dvb:dash:hdr-dmi' && prop.value == 'ST2094-10')
                    config.video.hdrMetadataType = 'smpteSt2094-10'
                else if (prop.schemeIdUri == 'urn:dvb:dash:hdr-dmi' && prop.value == 'SL-HDR2')
                    config.video.hdrMetadataType = 'slhdr2'     // XXXGJM TODO
                else if (prop.schemeIdUri == 'urn:dvb:dash:hdr-dmi' && prop.value == 'ST2094-40')
                    config.video.hdrMetadataType = 'smpteSt2094-40'
                else if (prop.schemeIdUri == 'urn:dvb:dash:hdr-dmi')
                    supported = false;

                /*
                // for the moment, just ensure that ColourPrimaries and MatrixCoefficients are consistent
                if (prop.schemeIdUri == 'urn:mpeg:mpegB:cicp:MatrixCoefficients') {
                    if (prop.value != essentialProperties.filter(v => v.schemeIdUri == 'urn:mpeg:mpegB:cicp:ColourPrimaries').value)
                        return false
                }
                */

            }

            if (supported) {
                console.log("[HdrPlugIn] representation: %o", representation);
                console.log("[HdrPlugIn] config: %o", config);
                supported = await navigator.mediaCapabilities.decodingInfo(config).then((result) => result.supported);
                console.log(`[HdrPlugIn] MediaCapabilities said ${supported} for ${JSON.stringify(config, null, 4)}`)
            }
        };

        return supported;
    };


    //************************************************************************************
    // PUBLIC API
    //************************************************************************************

    return {
        initialize: function () {
            logger = player.getDebug().getLogger(player);

            if (navigator.mediaCapabilities) {
                // register property schemeIdUris handled by this plugin
                let props = player.getSettings().streaming.capabilities.supportedEssentialProperties;
                props = removeProperties(props);
                props.push(...EssentialProperties.map(p => { return { schemeIdUri: p } }));
                player.updateSettings({ streaming: { capabilities: { supportedEssentialProperties: props } } })

                // register capability filter
                player.registerCustomCapabilitiesFilter(filterCapabilities);
            } else {
                logger.warn('[HdrPlugIn] MediaCapabilities-API not found - doing nothing.');
            }
        }
    };
};
